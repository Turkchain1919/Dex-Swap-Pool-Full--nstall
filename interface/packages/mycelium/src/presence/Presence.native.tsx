import { isTestEnv } from '@universe/environment'
import type { SporeTimingCurveName } from '@universe/tailwind/animations'
import { getSporeTimingConfig } from '@universe/tailwind/animations/reanimated'
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useReducer,
  useRef,
  type JSX,
  type ReactElement,
  type ReactNode,
} from 'react'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useEvent } from 'utilities/src/react/hooks'
import type { PresenceProps } from './PresenceProps'

/**
 * Spore curve driving the native presence fade pair. `200ms` is the Reanimated
 * counterpart of the shipped web presets (`animate-spore-enter-fade-in` /
 * `animate-spore-exit-fade-out`, both 200ms in
 * `@universe/tailwind/css/compat.css`), so a shared call site fades on the
 * same clock on both platforms.
 */
const PRESENCE_FADE_CURVE: SporeTimingCurveName = '200ms'

declare const __DEV__: boolean | undefined

/** Metro defines `__DEV__` (false in release builds); outside Metro this leg only runs under test — treat as dev. */
function isDevEnvironment(): boolean {
  return typeof __DEV__ === 'boolean' ? __DEV__ : true
}

type ChildKey = string

interface PresenceChildProps {
  /** Legacy Tamagui opt-out, honored like the web leg: `false` skips the exit hold. */
  animatePresence?: boolean
  /** Compat layout prop (mycelium/legacy `Flex`): read only to detect out-of-flow children. */
  position?: unknown
  /** Raw RN style (object or nested array): read only to detect out-of-flow children. */
  style?: unknown
  /** Utility classes: read only to detect an out-of-flow child written as `absolute`. */
  className?: unknown
}

/**
 * Layout box given to the wrapper of an out-of-flow child, so the child's
 * containing block is the SAME box it would resolve against with no wrapper at
 * all: the parent's padding box.
 *
 * Without this, an unstyled in-flow wrapper has no flow content to size from,
 * so Yoga gives it main-axis size 0 and an `inset: 0` child collapses with it
 * (measured: `500x900` with no wrapper, `500x0` inside an unstyled one) — while
 * the child is merely PRESENT, not exiting.
 */
const OUT_OF_FLOW_WRAPPER_STYLE = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const

/** True when a (possibly nested-array) RN style declares `position: 'absolute'`. */
function styleDeclaresAbsolute(style: unknown): boolean {
  if (Array.isArray(style)) {
    return style.some(styleDeclaresAbsolute)
  }
  return typeof style === 'object' && style !== null && (style as { position?: unknown }).position === 'absolute'
}

/**
 * Whether a presence-managed child is out of flow, from the three channels a
 * consumer can declare it through: the compat `position` prop, a raw RN
 * `style`, and the `absolute` utility class. Read-only prop inspection — the
 * child element is never cloned or rewritten (the web leg owns that).
 */
function isOutOfFlowChild(element: PresenceElement): boolean {
  const props = element.props
  if (props.position === 'absolute') {
    return true
  }
  if (styleDeclaresAbsolute(props.style)) {
    return true
  }
  return typeof props.className === 'string' && props.className.split(/\s+/).includes('absolute')
}

type PresenceElement = ReactElement<PresenceChildProps>

interface ExitingEntry {
  /** The original element as last rendered while present (frozen for the exit hold). */
  element: PresenceElement
  /** Render slot the child held when it left, so the clone keeps its position. */
  index: number
}

/**
 * Flatten to keyed elements. Non-elements (text, numbers) are not
 * presence-managed and are dropped, mirroring the web leg. The index fallback
 * only supports the single-conditional-child shape — swapping siblings
 * requires explicit keys.
 */
function keyedChildren(children: ReactNode): Array<[ChildKey, PresenceElement]> {
  const out: Array<[ChildKey, PresenceElement]> = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return
    }
    out.push([child.key ?? `presence-${out.length}`, child as PresenceElement])
  })
  return out
}

interface PresenceChildWrapperProps {
  /** True while the parent holds this child for its exit animation. */
  exiting: boolean
  /** Fade in from transparent when the wrapper mounts (read once, at mount). */
  fadeInOnMount: boolean
  /** True when the wrapped child is out of flow, so the wrapper must not size from flow content. */
  outOfFlow: boolean
  onExitFinished: () => void
  children: ReactNode
}

/**
 * Owns the Reanimated lifecycle of one presence-managed child. A separate
 * component so each keyed child gets its own shared value: the wrapper stays
 * the same React instance when its child moves between present and exiting
 * (same key, same fragment), which is what lets a cancelled exit spring back
 * to visible instead of remounting.
 */
function PresenceChildWrapper({
  exiting,
  fadeInOnMount,
  outOfFlow,
  onExitFinished,
  children,
}: PresenceChildWrapperProps): JSX.Element {
  const opacity = useSharedValue(fadeInOnMount ? 0 : 1)
  const handleExitFinished = useEvent(onExitFinished)

  useEffect(() => {
    if (exiting) {
      opacity.value = withTiming(0, getSporeTimingConfig(PRESENCE_FADE_CURVE), (finished) => {
        if (finished) {
          runOnJS(handleExitFinished)()
        }
      })
      return
    }
    // Mount enter (opacity seeded at 0), or an exit cancelled by re-entry:
    // settle at visible. Always assign — replacing any in-flight exit fade is
    // the point. A JS-thread read of `opacity.value` still returns 1 before
    // the exit timing's first frame lands, so guarding on it would skip the
    // restore and let the running fade settle a still-mounted child at 0.
    // For an already-visible wrapper this is a no-op 1→1 timing.
    opacity.value = withTiming(1, getSporeTimingConfig(PRESENCE_FADE_CURVE))
  }, [exiting, opacity, handleExitFinished])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity])

  if (outOfFlow) {
    // `box-none` keeps the fidelity the fill would otherwise cost: the wrapper
    // spans the whole parent, so as a hit target it would swallow touches that
    // belong to a sibling underneath it (the dropdown content's wrapper over
    // the backdrop). `box-none` makes the wrapper itself untargetable while its
    // subtree still receives touches — exactly the no-wrapper behavior.
    return (
      <Animated.View pointerEvents="box-none" style={[OUT_OF_FLOW_WRAPPER_STYLE, animatedStyle]}>
        {children}
      </Animated.View>
    )
  }

  return <Animated.View style={animatedStyle}>{children}</Animated.View>
}

/**
 * Keyed slot for a child that owns its own native animation. A Fragment, so no
 * wrapper: nothing to seed or fade, no `OUT_OF_FLOW_WRAPPER_STYLE` to
 * compensate, and the child's own view is the root of the removal React hands
 * to Reanimated rather than a descendant of a co-removed wrapper.
 */
function presenceChildPassthrough(key: ChildKey, element: PresenceElement): JSX.Element {
  return <Fragment key={key}>{element}</Fragment>
}

/**
 * Native `Presence`: the Reanimated leg of the presence primitive
 * (INFRA-3344), same clone-list lifecycle as the web leg. Children are diffed
 * by key; a removed child stays mounted — frozen as last rendered — while a
 * pure-Reanimated Spore fade runs, and unmounts when the animation settles.
 * `initial`, `exitBeforeEnter`, `onExitComplete` and the child-level
 * `animatePresence: false` opt-out behave exactly like the web leg; under
 * `isTestEnv()` removals unmount immediately so consumer test suites stay
 * instant.
 *
 * Three deliberate platform differences, all rooted in native having no CSS
 * class channel:
 *  - The enter/exit presentation is owned here (an opacity fade on the Spore
 *    `200ms` clock — the same duration as the web `animate-spore-enter-fade-in`
 *    / `animate-spore-exit-fade-out` presets) instead of read from the child's
 *    `className`. Each child renders inside an `Animated.View` wrapper, which
 *    carries no layout styling for an in-flow child and fills the parent
 *    (`box-none`) for an out-of-flow one, so an absolutely positioned child
 *    resolves against the same containing block it would with no wrapper.
 *  - `childOwnsNativeAnimation` hands both lanes back to the child; it is the
 *    web leg that is inert for that prop (see `PresenceProps`).
 *  - `custom`/`getExitProps` re-resolve CSS exit presentation and are inert
 *    here (a one-time dev warning fires if they are passed). Their one
 *    consumer family — the direction-aware pager — ships as a bespoke
 *    Reanimated leg in `../animate-presence-pager` and does not go through
 *    this component on native.
 */
export function Presence<TCustom = unknown>({
  children,
  initial = true,
  exitBeforeEnter = false,
  onExitComplete,
  custom,
  getExitProps,
  childOwnsNativeAnimation = false,
}: PresenceProps<TCustom>): JSX.Element {
  const [, forceRender] = useReducer((tick: number) => tick + 1, 0)

  // Silent-no-op guard: these props drive the web leg's exit re-resolution
  // and do nothing here — say so once per mount instead of diverging quietly.
  const warnedWebOnlyPropsRef = useRef(false)
  if (!warnedWebOnlyPropsRef.current && (custom !== undefined || getExitProps !== undefined) && isDevEnvironment()) {
    warnedWebOnlyPropsRef.current = true
    // oxlint-disable-next-line no-console -- dev-only misuse warning (floating-overlay precedent; mycelium has no logger dep)
    console.warn(
      'Presence (native): `custom`/`getExitProps` re-resolve CSS exit presentation and are inert on this platform — exits run the standard Spore fade. For direction-aware paging use @universe/mycelium/animate-presence-pager, whose native leg is a bespoke Reanimated pager.',
    )
  }

  const exitingRef = useRef<Map<ChildKey, ExitingEntry>>(new Map())
  /** Present children of the last committed render (post-deferral), original elements. */
  const presentRef = useRef<Map<ChildKey, PresenceElement> | null>(null)
  /** Output key order of the last committed render. */
  const renderedOrderRef = useRef<ChildKey[]>([])
  /** Keys whose enter animation `initial={false}` suppressed (first-render children). */
  const skipEnterKeysRef = useRef<Set<ChildKey>>(new Set())
  /**
   * Keys cancelled (re-entered) by the most recently RUN render call, rebuilt
   * fresh each render — assigned, never appended, so a discarded render can't
   * leak stale cancellations forward (see the web leg for the full rationale).
   * `finishExit` checks it so a stale animation completion can't finish an
   * exit that a same-commit cancellation already owns.
   */
  const cancelledKeysRef = useRef<Set<ChildKey>>(new Set())
  /**
   * Set when a genuine completion leaves other entries still in `exiting`
   * (possibly only cancelled ones the post-commit drain hasn't removed yet);
   * the drain fires the deferred `onExitComplete` once `exiting` empties.
   */
  const pendingExitCompletionRef = useRef(false)

  const finishExit = useEvent((key: ChildKey): void => {
    if (cancelledKeysRef.current.has(key)) {
      // A cancellation already claims this entry (re-entered this commit, not
      // yet drained below) — the drain owns removing it, not a stale
      // animation completion still pending from before the re-entry.
      return
    }
    if (!exitingRef.current.has(key)) {
      return
    }
    exitingRef.current.delete(key)
    skipEnterKeysRef.current.delete(key)
    forceRender()
    pendingExitCompletionRef.current = true
    if (exitingRef.current.size === 0) {
      pendingExitCompletionRef.current = false
      onExitComplete?.()
    }
  })

  const currentChildren = keyedChildren(children)
  const currentKeys = new Set(currentChildren.map(([key]) => key))
  const exiting = exitingRef.current
  const previousPresent = presentRef.current

  // First render with initial={false}: pin the initial keys so their wrappers
  // mount already visible.
  if (previousPresent === null && !initial) {
    for (const [key] of currentChildren) {
      skipEnterKeysRef.current.add(key)
    }
  }

  // Render-phase diff (an effect would run after React already unmounted the
  // removed child): a key in the last committed render but absent from
  // `children` starts exiting now. Idempotent under replayed renders.
  if (previousPresent !== null) {
    for (const [key, element] of previousPresent) {
      if (!currentKeys.has(key) && !exiting.has(key)) {
        exiting.set(key, { element, index: renderedOrderRef.current.indexOf(key) })
      }
    }
  }

  // A key that re-entered cancels its exit. Read-only against `exiting` here
  // so replayed renders stay idempotent; the actual removal happens in the
  // post-commit drain below.
  const cancelledKeysThisRender = new Set<ChildKey>()
  for (const [key] of exiting) {
    if (currentKeys.has(key)) {
      cancelledKeysThisRender.add(key)
    }
  }
  cancelledKeysRef.current = cancelledKeysThisRender
  const stillExitingCount = exiting.size - cancelledKeysThisRender.size

  // exitBeforeEnter: hold back brand-new keys while anything is still
  // exiting; the exit-completion re-render mounts them. A key cancelled out
  // of `exiting` above is already present, not a new mount, so it's admitted.
  const renderablePairs =
    exitBeforeEnter && stillExitingCount > 0
      ? currentChildren.filter(([key]) => previousPresent?.has(key) === true || cancelledKeysThisRender.has(key))
      : currentChildren

  const output: Array<{ key: ChildKey; element: JSX.Element }> = renderablePairs.map(([key, element]) => ({
    key,
    element: childOwnsNativeAnimation ? (
      presenceChildPassthrough(key, element)
    ) : (
      <PresenceChildWrapper
        key={key}
        exiting={false}
        fadeInOnMount={!skipEnterKeysRef.current.has(key)}
        outOfFlow={isOutOfFlowChild(element)}
        onExitFinished={() => finishExit(key)}
      >
        {element}
      </PresenceChildWrapper>
    ),
  }))

  // Excludes cancelled keys: `exiting` itself still holds them (the removal
  // is deferred) but this render's output must treat them as present
  // children, not exit clones.
  const orderedExits = [...exiting.entries()]
    .filter(([key]) => !cancelledKeysThisRender.has(key))
    .sort((a, b) => a[1].index - b[1].index)
  for (const [key, entry] of orderedExits) {
    // Instant lanes (test env, animatePresence={false}) render the clone
    // without the exiting flag so its wrapper never arms a fade the parent
    // effect below is about to cut short.
    const instantExit = isTestEnv() || entry.element.props.animatePresence === false
    const clone = childOwnsNativeAnimation ? (
      presenceChildPassthrough(key, entry.element)
    ) : (
      <PresenceChildWrapper
        key={key}
        exiting={!instantExit}
        fadeInOnMount={false}
        outOfFlow={isOutOfFlowChild(entry.element)}
        onExitFinished={() => finishExit(key)}
      >
        {entry.element}
      </PresenceChildWrapper>
    )
    const at = entry.index < 0 ? output.length : Math.min(entry.index, output.length)
    output.splice(at, 0, { key, element: clone })
  }

  const renderedOrder = output.map((item) => item.key)

  useEffect(() => {
    // Committed bookkeeping the next render's diff reads.
    presentRef.current = new Map(renderablePairs)
    renderedOrderRef.current = renderedOrder

    // The actual `exiting` removal for a cancelled key, deferred from render.
    for (const key of cancelledKeysRef.current) {
      exitingRef.current.delete(key)
    }
    cancelledKeysRef.current = new Set()
    // A completion can land while a cancellation hasn't drained yet —
    // `finishExit` then leaves the flag set instead of firing; draining here
    // is what finally empties `exiting`, so this is where the deferred
    // callback fires.
    if (pendingExitCompletionRef.current && exitingRef.current.size === 0) {
      pendingExitCompletionRef.current = false
      onExitComplete?.()
    }

    // Instant lanes, mirroring the web leg: consumer test suites stay
    // instant, and animatePresence={false} children skip the exit hold. The
    // animated lane needs no arming here — each wrapper's own effect starts
    // the exit when its `exiting` prop flips.
    // childOwnsNativeAnimation joins the instant lanes: nothing here can
    // observe the child's worklet, which starts once this key leaves.
    const skipAnimation = isTestEnv() || childOwnsNativeAnimation
    for (const [key, entry] of exitingRef.current) {
      if (skipAnimation || entry.element.props.animatePresence === false) {
        finishExit(key)
      }
    }
  })

  // Wrappers are Animated.Views carrying no layout styling of their own for an
  // in-flow child, and an out-of-flow fill (see OUT_OF_FLOW_WRAPPER_STYLE) for
  // an absolutely positioned one. Either way they are real view nodes — unlike
  // the web leg's clone list, the children do gain one wrapping view
  // (documented platform difference).
  return <>{output.map((item) => item.element)}</>
}
