import { renderHookWithProviders, renderWithProviders } from 'src/test/render'

// re-export everything
export * from '@testing-library/react-native'
// override render method
export { renderWithProviders as render, renderHookWithProviders as renderHook }

/**
 * Reads a React prop from the nearest fiber that defines it, walking up from a DOM element.
 * Replacement for RNTL's `instance.props[...]` under vitest/jsdom, where queries return DOM
 * elements (React Native props like numberOfLines never reach the DOM).
 */
export function getNearestFiberProp(element: unknown, propName: string): unknown {
  const node = element as Record<string, unknown>
  const fiberKey = Object.keys(node).find((k) => k.startsWith('__reactFiber$'))
  const propsKey = Object.keys(node).find((k) => k.startsWith('__reactProps$'))
  let fiber = fiberKey ? (node as any)[fiberKey] : undefined
  // the DOM node can point at the stale half of React's double buffer; __reactProps$ is always
  // current, so use it to pick the committed fiber
  if (fiber && propsKey && fiber.memoizedProps !== (node as any)[propsKey] && fiber.alternate) {
    fiber = fiber.alternate
  }
  for (let depth = 0; fiber && depth < 20; depth += 1) {
    const props = fiber.memoizedProps
    if (props && propName in props) {
      return props[propName]
    }
    fiber = fiber.return
  }
  return undefined
}

// Registered global symbol every mycelium compat primitive is stamped with
// (`markMyceliumPrimitive`). `packages/ui` already recomputes it the same way
// rather than importing it (circular project reference), and `@universe/mycelium`
// exports neither the symbol nor `isMyceliumPrimitive`, so we mirror that
// contract here. The KEY string is pinned by primitive-marker.test.tsx.
const MYCELIUM_PRIMITIVE = Symbol.for('mycelium.primitive')

/**
 * A queried wrapper's OWN styling primitive: the Tamagui `styled` component
 * (carries `staticConfig`) or the mycelium compat primitive (carries the
 * registered primitive marker) that authored its style props. This is the fiber
 * the query's element boundary stops at — anything above it is an ancestor.
 */
function isStylingPrimitive(type: unknown): boolean {
  if (type === null || (typeof type !== 'object' && typeof type !== 'function')) {
    return false
  }
  const t = type as Record<symbol | string, unknown>
  return t[MYCELIUM_PRIMITIVE] === true || Boolean(t['staticConfig'])
}

/**
 * Reads a style prop authored on the element a query targeted, element-scoped and
 * engine-agnostic. RNTL/jsdom queries return the host DOM node; the authored token
 * prop (e.g. `backgroundColor="$surface1"`) lives on a composite fiber above it, but
 * WHICH one depends on the styling engine: Tamagui puts it on the first composite (the
 * `styled` Flex directly above the host), while mycelium's `FlexCompat.native` inserts a
 * plain react-native-web `View` composite in between, so the authored `FlexCompat` is the
 * SECOND composite. This walks up from the host, returning the prop from whichever fiber
 * carries it, but STOPS at (and including) the wrapper's own styling primitive — so an
 * unrelated ancestor's copy of the prop can never vacuously satisfy the check, and a
 * wrapper that drops the prop resolves to `undefined` under either engine.
 *
 * The styling primitive sits within a couple of composites above the host under either engine
 * (Tamagui: the first composite; mycelium: the second, above an inserted react-native-web View),
 * so it MUST appear inside a strict, small bound. If it doesn't, the helper's premise (that the
 * queried element is authored by a styling primitive) doesn't hold for this render — degrading to
 * an unbounded ancestor scan would let an unrelated ancestor's copy of the prop vacuously satisfy
 * the check, so we THROW instead of returning a value from beyond the boundary.
 */
const OWN_STYLE_PROP_MAX_FIBERS = 8
export function getOwnStyleProp(element: unknown, propName: string): unknown {
  const node = element as Record<string, unknown>
  const fiberKey = Object.keys(node).find((k) => k.startsWith('__reactFiber$'))
  const propsKey = Object.keys(node).find((k) => k.startsWith('__reactProps$'))
  let fiber = fiberKey ? (node as any)[fiberKey] : undefined
  // the DOM node can point at the stale half of React's double buffer; __reactProps$ is always
  // current, so use it to pick the committed fiber
  if (fiber && propsKey && fiber.memoizedProps !== (node as any)[propsKey] && fiber.alternate) {
    fiber = fiber.alternate
  }
  for (let depth = 0; fiber && depth < OWN_STYLE_PROP_MAX_FIBERS; depth += 1) {
    const props = fiber.memoizedProps
    if (props && propName in props) {
      return props[propName]
    }
    // Reached the wrapper's own primitive without the prop — everything above is an ancestor.
    if (isStylingPrimitive(fiber.type)) {
      return undefined
    }
    fiber = fiber.return
  }
  // No styling-primitive boundary before the bound — the walk can't be scoped, so a value read from
  // here on would come from an unbounded ancestor scan. Fail loudly rather than pass vacuously.
  const startProps = (propsKey ? (node as any)[propsKey] : undefined) as Record<string, unknown> | undefined
  const target = (startProps?.['testID'] ??
    startProps?.['data-testid'] ??
    startProps?.['accessibilityLabel'] ??
    'queried element') as string
  throw new Error(
    `getOwnStyleProp: no styling primitive (mycelium marker or Tamagui staticConfig) found above ${target} within ${OWN_STYLE_PROP_MAX_FIBERS} fibers — cannot scope the ${propName} read`,
  )
}

/**
 * Collects a React prop from every fiber that defines it, walking up from a DOM element.
 * Use when the nearest fiber's value is a framework-processed one (e.g. react-native-web
 * rewrites `className` on host elements) and the original component-level prop lives on an
 * ancestor fiber.
 */
export function getFiberPropChain(element: unknown, propName: string): unknown[] {
  const node = element as Record<string, unknown>
  const fiberKey = Object.keys(node).find((k) => k.startsWith('__reactFiber$'))
  const propsKey = Object.keys(node).find((k) => k.startsWith('__reactProps$'))
  let fiber = fiberKey ? (node as any)[fiberKey] : undefined
  // the DOM node can point at the stale half of React's double buffer; __reactProps$ is always
  // current, so use it to pick the committed fiber
  if (fiber && propsKey && fiber.memoizedProps !== (node as any)[propsKey] && fiber.alternate) {
    fiber = fiber.alternate
  }
  const values: unknown[] = []
  for (let depth = 0; fiber && depth < 20; depth += 1) {
    const props = fiber.memoizedProps
    if (props && propName in props) {
      values.push(props[propName])
    }
    fiber = fiber.return
  }
  return values
}
