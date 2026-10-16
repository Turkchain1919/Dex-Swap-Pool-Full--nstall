import { cva } from 'class-variance-authority'
/**
 * The house styled() factory for the Tamagui → Tailwind migration.
 *
 * Three lanes, closed by construction:
 * 1. class-select — literal class strings only (the factory can only SELECT
 *    classes written in source, so the oxide scanner sees every candidate on
 *    both platform bundles): cva owns base + per-variant selection,
 *    compoundVariants match through the same ruleMatches as the hover lane.
 * 2. inline-style — open-domain values (props-driven numerics, RN shadows)
 *    computed from the variant selection AND the raw prop bag resolve to a
 *    `style` object, mirroring the compat inline lane (#37880). The output
 *    type bans class shapes — this lane can never emit a className.
 * 3. hover — state-driven hover rules (the platform hover seam → React
 *    state; touch pointers filtered), because `hover:` classes never resolve
 *    in uniwind's native stylesheet.
 *
 * Emission safety is proven by the class-universe gates in
 * packages/tailwind/src/parity/core (every collected class must resolve in
 * the web CSS AND the native stylesheet map); conversions bind them via
 * describeStyledFactoryGate / describeStyledFactoryWebGate.
 */
import { type ComponentType, createElement, type ElementType, forwardRef, useCallback, useState } from 'react'
import { cn } from '../cn'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import { validateStyledClasses } from './classes'
import type {
  CompoundRule,
  ExposedStyledConfig,
  HoverRule,
  InlineStyle,
  LiteralClass,
  LiteralRuleClasses,
  StyledComponent,
  StyledConfig,
  StyledVariants,
  VariantSelection,
} from './types'

declare const __DEV__: boolean | undefined

/**
 * `__DEV__` comes from the consuming build's define (Metro sets it natively;
 * the web/extension/mission-control/rh-cca configs define it for their
 * bundles). An environment without the define fails OPEN to dev — loud
 * validation in tests and unconfigured builds beats silently shipping a dead
 * check (FloatingOverlay.native precedent).
 */
function isDevBuild(): boolean {
  return typeof __DEV__ === 'boolean' ? __DEV__ : true
}

type AnyProps = Record<string, unknown>
type Selection = Record<string, unknown>

/** cva compares stringified option keys; booleans normalize the same way here. */
function optionKey(value: unknown): string {
  return String(value)
}

function ruleMatches(rule: CompoundRule<StyledVariants>, resolved: Selection): boolean {
  for (const [key, wanted] of Object.entries(rule)) {
    if (key === 'class') {
      continue
    }
    const actual = resolved[key]
    if (actual === undefined || actual === null) {
      return false
    }
    const allowed = Array.isArray(wanted) ? wanted : [wanted]
    if (!allowed.some((option) => optionKey(option) === optionKey(actual))) {
      return false
    }
  }
  return true
}

function hoverClasses(rules: ReadonlyArray<HoverRule<StyledVariants>>, resolved: Selection): string {
  return rules
    .filter((rule) => ruleMatches(rule, resolved))
    .map((rule) => rule.class)
    .join(' ')
}

interface MergeStyleOptions {
  inline: InlineStyle | undefined
  incoming: unknown
  domBase: boolean
}

/**
 * A composed outer factory sees a non-DOM base (the inner factory) and hands
 * its style down in RN array form; when the chain bottoms out at a DOM host
 * that array must flatten to ONE object (later entries win, matching RN's
 * flatten semantics) — spreading the array would produce junk numeric keys
 * and silently drop every entry.
 */
function flattenDomStyle(value: unknown): InlineStyle | undefined {
  if (value === undefined || value === null || value === false) {
    return undefined
  }
  if (Array.isArray(value)) {
    let out: InlineStyle | undefined
    for (const entry of value) {
      const flat = flattenDomStyle(entry)
      if (flat !== undefined) {
        out = { ...out, ...flat }
      }
    }
    return out
  }
  if (typeof value !== 'object') {
    // RN's style contract admits shapes a DOM host cannot take — Pressable
    // state FUNCTIONS and registered-StyleSheet NUMBERS. Loud in dev like the
    // factory's other guards (this one fires per render because the value
    // only exists at render); in production the entry is DROPPED instead —
    // a missing style beats crashing the whole subtree.
    if (isDevBuild()) {
      throw new Error(
        `styled(): a DOM host received a non-object style (${typeof value}) — RN style functions and registered StyleSheet ids have no DOM rendering path; pass a plain style object (or array of them).`,
      )
    }
    return undefined
  }
  return value as InlineStyle
}

/**
 * Config inline style merges UNDER the caller's `style`. RN accepts arrays
 * (and Pressable state functions); DOM needs a single flat object — including
 * when the incoming style is an array from a composed outer factory.
 */
function mergeStyle({ inline, incoming, domBase }: MergeStyleOptions): unknown {
  if (domBase) {
    const flat = flattenDomStyle(incoming)
    if (inline === undefined) {
      return flat
    }
    if (flat === undefined) {
      return inline
    }
    return { ...inline, ...flat }
  }
  if (inline === undefined) {
    return incoming
  }
  if (incoming === undefined || incoming === null) {
    return inline
  }
  if (typeof incoming === 'function') {
    return (state: unknown) => [inline, (incoming as (state: unknown) => unknown)(state)]
  }
  return [inline, incoming]
}

function chainHandlers(theirs: unknown, ours: (event: unknown) => void): (event: unknown) => void {
  return (event: unknown): void => {
    if (typeof theirs === 'function') {
      ;(theirs as (event: unknown) => void)(event)
    }
    ours(event)
  }
}

/**
 * Whether a hover-enter event came from a touch pointer. Touch taps fire
 * pointerenter on DOM (and can reach RN hover seams through pointer-derived
 * events); legacy Tamagui hover styles never apply there (`@media (hover)`
 * guard on web, pointer-only Pressability on native), so the state-driven
 * hover lane must not either. Reads `pointerType` off the event or its
 * nativeEvent; events without one (mouse-only browsers, synthetic tests,
 * RN's onHoverIn from real pointers) count as hover-capable.
 *
 * Shared with the compat `domProps` hover seam — every hover channel in the
 * package applies the same filter.
 */
export function isTouchPointerEvent(event: unknown): boolean {
  if (typeof event !== 'object' || event === null) {
    return false
  }
  const shaped = event as { pointerType?: unknown; nativeEvent?: { pointerType?: unknown } }
  const pointerType = shaped.pointerType ?? shaped.nativeEvent?.pointerType
  return pointerType === 'touch'
}

function componentName(base: ElementType): string {
  if (typeof base === 'string') {
    return base
  }
  const named = base as { displayName?: string; name?: string }
  return named.displayName ?? named.name ?? 'Component'
}

/**
 * Static host-kind capability marker, propagated through composed chains to
 * the real host:
 * - `'dom'` — the chain bottoms out at a DOM intrinsic: styles must flatten
 *   to ONE object, and the hover seam is `onPointerEnter`/`onPointerLeave`.
 * - `'native-hoverable'` — a host that fires `onHoverIn`/`onHoverOut`
 *   (Pressable-family, or a wrapper that forwards those handlers to one).
 * DOM intrinsics carry `'dom'` implicitly; factory products carry the kind
 * RESOLVED from their own base (so an outer styled() sees the real host's
 * platform through any depth of composition); every other component base
 * declares the marker explicitly — `markHoverable(base)` for wrappers, or a
 * hand-written `styledHostKind` static. No displayName sniffing: names are
 * minified away in prod and shared by hoverless wrappers.
 */
export type StyledHostKind = 'dom' | 'native-hoverable'

interface HostKindCarrier {
  styledHostKind?: StyledHostKind
  styledConfig?: unknown
}

/**
 * Declare a component base hover-capable (it renders or forwards
 * `onHoverIn`/`onHoverOut` to a Pressable-family host) without mutating it:
 * returns a forwarding wrapper carrying the static marker.
 */
export function markHoverable<P extends object>(base: ComponentType<P>): ComponentType<P> & HostKindCarrier {
  const Marked = forwardRef<unknown, P>(function MarkedHoverable(props, ref) {
    return createElement(base as ElementType, { ...props, ref } as AnyProps)
  })
  Marked.displayName = `Hoverable(${componentName(base as ElementType)})`
  return Object.assign(Marked, { styledHostKind: 'native-hoverable' as const }) as unknown as ComponentType<P> &
    HostKindCarrier
}

/** The base's resolved host kind: implicit for DOM intrinsics, the declared/propagated marker otherwise. */
function resolveHostKind(base: ElementType): StyledHostKind | undefined {
  if (typeof base === 'string') {
    return 'dom'
  }
  return (base as HostKindCarrier).styledHostKind
}

/**
 * Hover-lane seam contract (dev, fail-closed): the hover handlers attach to
 * the IMMEDIATE base only — onPointerEnter/onPointerLeave on DOM intrinsics,
 * onHoverIn/onHoverOut on marked component bases. Everything else throws at
 * definition time rather than shipping a hover lane that may never fire:
 * - a factory-composed base: the handlers tunnel through the inner factory to
 *   ITS host — declare the hover rules on the innermost styled() call;
 * - any base without the capability marker (View/Text/Image/ScrollView emit
 *   no hover events; an unmarked wrapper is indistinguishable from them, so
 *   unknown fails CLOSED — loud at definition time instead of a silent dead
 *   hover lane at runtime).
 */
function validateHoverSeam(base: ElementType, name: string): void {
  if ((base as HostKindCarrier).styledConfig !== undefined) {
    throw new Error(
      `styled(${name}): hover rules cannot attach through a factory-composed base — the hover seam binds to the immediate base only. Declare the hover rules on the innermost styled() call (the one that owns the real host).`,
    )
  }
  if (resolveHostKind(base) === undefined) {
    throw new Error(
      `styled(${name}): hover rules require a base that emits hover events, and "${name}" carries no styledHostKind capability marker — only DOM intrinsics and marked hover-capable hosts fire the hover seam; unmarked bases fail closed instead of shipping a dead hover lane. Wrap the base in markHoverable(…) if it is (or forwards onHoverIn/onHoverOut to) a Pressable-family host.`,
    )
  }
}

/** Literal-string check applied per variant branch (see LiteralClass). */
type LiteralVariantClasses<V extends StyledVariants> = {
  [K in keyof V]: { [O in keyof V[K]]: LiteralClass<V[K][O]> }
}

export function styled<
  B extends ElementType,
  const V extends StyledVariants = Record<never, never>,
  const BaseClasses extends string = '',
  const Compounds extends ReadonlyArray<CompoundRule<V>> = ReadonlyArray<CompoundRule<V>>,
  const Hovers extends ReadonlyArray<HoverRule<V>> = ReadonlyArray<HoverRule<V>>,
>(
  base: B,
  config: StyledConfig<V> & {
    base?: BaseClasses & LiteralClass<BaseClasses>
    variants?: V & LiteralVariantClasses<V>
    compoundVariants?: Compounds & LiteralRuleClasses<Compounds>
    hover?: Hovers & LiteralRuleClasses<Hovers>
  },
): StyledComponent<B, V> {
  const looseConfig = config as ExposedStyledConfig<StyledVariants>
  const name = componentName(base)
  // The resolved host kind is a SIGNAL propagated through composed chains
  // (each factory product carries the kind resolved from its own base), so a
  // depth-N composition still knows whether the chain bottoms out at a DOM
  // host — never inferred from the immediate base's shape alone.
  const hostKind = resolveHostKind(base)
  const domBase = hostKind === 'dom'
  if (isDevBuild()) {
    validateStyledClasses({ config: looseConfig, componentName: name, domBase })
    if (looseConfig.hover !== undefined) {
      validateHoverSeam(base, name)
    }
  }

  // cva owns base + per-variant selection only; compoundVariants are matched
  // by the SAME ruleMatches the hover lane uses (one matching semantics for
  // every rule shape in the config, not two subtly different ones).
  const variantFn = cva(looseConfig.base, {
    variants: looseConfig.variants ?? {},
    defaultVariants: (looseConfig.defaultVariants ?? {}) as never,
  })
  const compoundRules = looseConfig.compoundVariants ?? []
  const variantKeys = new Set(Object.keys(looseConfig.variants ?? {}))
  const forwardKeys = new Set(looseConfig.forwardProps ?? [])
  const hoverRules = looseConfig.hover

  const Styled = forwardRef<unknown, AnyProps>(function StyledRender(props, ref) {
    const { className, style, ...rest } = props
    const selection: Selection = {}
    const forwarded: AnyProps = {}
    for (const [key, value] of Object.entries(rest)) {
      if (variantKeys.has(key)) {
        selection[key] = value
        if (forwardKeys.has(key)) {
          forwarded[key] = value
        }
      } else {
        forwarded[key] = value
      }
    }

    const resolved: Selection = { ...(looseConfig.defaultVariants as Selection | undefined) }
    for (const [key, value] of Object.entries(selection)) {
      if (value !== undefined) {
        resolved[key] = value
      }
    }

    const [hovered, setHovered] = useState(false)
    // Touch pointers never apply hover classes (legacy hover styles are
    // hover-capability-gated); leave always resets, so a filtered enter can
    // never strand stale hover state.
    const onHoverStart = useCallback((event: unknown) => {
      if (!isTouchPointerEvent(event)) {
        setHovered(true)
      }
    }, [])
    const onHoverEnd = useCallback(() => setHovered(false), [])

    // `rest` is the raw prop bag (no className/style, defaults not applied) —
    // the open-domain lane for prop VALUES no enumerable variant can express.
    const inline = looseConfig.inlineStyle?.(resolved as VariantSelection<StyledVariants>, rest)

    if (hoverRules !== undefined) {
      const enterKey = domBase ? 'onPointerEnter' : 'onHoverIn'
      const leaveKey = domBase ? 'onPointerLeave' : 'onHoverOut'
      forwarded[enterKey] = chainHandlers(forwarded[enterKey], onHoverStart)
      forwarded[leaveKey] = chainHandlers(forwarded[leaveKey], onHoverEnd)
    }

    // Class precedence: base < variants/compounds < incoming `className`
    // (a composed outer factory's classes and the caller's arrive merged as
    // one string) < ACTIVE hover classes. Hover merges LAST because the hover
    // seam attaches only on the innermost styled() call — an outer factory's
    // static classes ride in through `className`, and legacy Tamagui gives an
    // active hoverStyle (pseudo priority 2) precedence over static props at
    // importance 0 from ANY source (config, composed wrapper, caller). Web
    // callers keep an override channel via `hover:`-prefixed classes (a
    // different tailwind-merge group, higher CSS specificity), mirroring a
    // legacy caller passing their own hoverStyle.
    return createElement(base, {
      ...forwarded,
      ref,
      className: cn(
        variantFn(selection as never),
        compoundRules.filter((rule) => ruleMatches(rule, resolved)).map((rule) => rule.class),
        className as string | undefined,
        hoverRules !== undefined && hovered && hoverClasses(hoverRules, resolved),
      ),
      style: mergeStyle({ inline, incoming: style, domBase }),
    })
  })
  Styled.displayName = `Styled(${name})`

  // A composed base contributes its own class universe: link its config so
  // collectStyledClasses (and the emission gates built on it) can walk the
  // whole chain from the outermost styledConfig.
  const baseStyledConfig = (base as { styledConfig?: ExposedStyledConfig<StyledVariants> }).styledConfig
  const exposedConfig = baseStyledConfig === undefined ? looseConfig : { ...looseConfig, baseStyledConfig }

  // Marked so legacy TouchableArea's WithInjectedColors skips the OUTERMOST
  // product of this factory instead of injecting color/backgroundColor onto
  // it (INFRA-3823) — every styled() output is a mycelium primitive by
  // construction, whatever base it composes.
  return markMyceliumPrimitive(
    Object.assign(
      Styled,
      hostKind === undefined
        ? { styledConfig: exposedConfig }
        : { styledConfig: exposedConfig, styledHostKind: hostKind },
    ),
  ) as unknown as StyledComponent<B, V>
}
