// Registered global symbol every mycelium compat primitive is stamped with
// (`markMyceliumPrimitive`). Mycelium exports neither the symbol nor
// `isMyceliumPrimitive`, so this mirrors the contract the same way
// `apps/mobile/src/test/test-utils.ts` does. The KEY string is pinned by
// primitive-marker.test.tsx.
const MYCELIUM_PRIMITIVE = Symbol.for('mycelium.primitive')

interface Fiber {
  type: unknown
  memoizedProps: Record<string, unknown> | null
  return: Fiber | null
  alternate: Fiber | null
}

function isStylingPrimitive(type: unknown): boolean {
  if (type === null || (typeof type !== 'object' && typeof type !== 'function')) {
    return false
  }
  const t = type as Record<symbol | string, unknown>
  return t[MYCELIUM_PRIMITIVE] === true || Boolean(t['staticConfig'])
}

const OWN_STYLE_PROP_MAX_FIBERS = 6

/**
 * Reads a style prop authored on the queried element. Walks fibers (rather than reading
 * depth 1 directly) and stops at the wrapper's own styling primitive, so an unrelated
 * ancestor's copy of the same prop name can't vacuously satisfy the check — safe because
 * both Tamagui's `styled()` output and mycelium's compat primitives render their host tag
 * directly with no wrapper, so the authored prop always lives on the first composite fiber.
 * Mirrors `apps/mobile/src/test/test-utils.ts`, which additionally handles the native
 * surface's extra react-native-web View.
 */
export function getOwnStyleProp(element: Element, propName: string): unknown {
  const node = element as unknown as Record<string, unknown>
  const fiberKey = Object.keys(node).find((key) => key.startsWith('__reactFiber$'))
  const propsKey = Object.keys(node).find((key) => key.startsWith('__reactProps$'))
  let fiber = (fiberKey ? node[fiberKey] : undefined) as Fiber | null | undefined
  const domProps = (propsKey ? node[propsKey] : undefined) as Record<string, unknown> | undefined
  // the DOM node can point at the stale half of React's double buffer; __reactProps$ is always
  // current, so use it to pick the committed fiber
  if (fiber && domProps && fiber.memoizedProps !== domProps && fiber.alternate) {
    fiber = fiber.alternate
  }
  for (let depth = 0; fiber && depth < OWN_STYLE_PROP_MAX_FIBERS; depth += 1) {
    const props = fiber.memoizedProps
    if (props && propName in props) {
      return props[propName]
    }
    if (isStylingPrimitive(fiber.type)) {
      return undefined
    }
    fiber = fiber.return
  }
  const target = (domProps?.['data-testid'] ?? 'queried element') as string
  throw new Error(
    `getOwnStyleProp: no styling primitive found above ${target} within ${OWN_STYLE_PROP_MAX_FIBERS} fibers — cannot scope the ${propName} read`,
  )
}
