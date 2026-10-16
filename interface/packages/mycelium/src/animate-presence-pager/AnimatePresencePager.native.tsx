import { isTestEnv } from '@universe/environment'
import { withSporeCurve } from '@universe/tailwind/animations/reanimated'
import { Children, useEffect, useReducer, useRef, type JSX, type ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { useEvent } from 'utilities/src/react/hooks'
import type { AnimatedPagerProps, AnimateTransitionProps, TransitionItemProps } from './types'
import { DEFAULT_PAGER_CURVE, DEFAULT_PAGER_DISTANCE, getAnimationOffsets } from './types'
import { usePagerDirection } from './usePagerDirection'

type PagerKey = string | number

interface PagerState {
  /** Key of the page on screen, or null when empty. */
  key: PagerKey | null
  /** Content frozen at the last at-rest render of `key` — what the exit shows. */
  frozen: ReactNode
  phase: 'idle' | 'exiting'
  /** Latest requested page while an exit or deferred mount is in flight. */
  pendingKey: PagerKey | null
  /** True once the exit-arming effect started the animation for this exit. */
  exitArmed: boolean
  /** A mount is deferred one commit so the shared values seed before first paint. */
  enterPending: boolean
}

/** Legacy `AnimatedItem` frame: full-width, grow. */
const WRAPPER_STYLE: ViewStyle = { flexGrow: 1, width: '100%' }
/** Legacy exitStyle stacked the outgoing page under the incoming one. */
const EXITING_STYLE: ViewStyle = { zIndex: 0 }

/**
 * Native `TransitionItem`: the bespoke Reanimated leg of the pager family
 * (INFRA-3344) — the legacy Tamagui `AnimatePresence exitBeforeEnter
 * custom={{ going }}` lifecycle transcribed onto shared values, the
 * SegmentedControl-indicator precedent. When `childKey` changes, the outgoing
 * page is frozen and slides/fades out along `animationType`, then the incoming
 * page slides/fades in; both run on the Spore `curve`
 * (`@universe/tailwind/animations/reanimated`, moti deliberately bypassed —
 * its opacity compositing misses frames on iOS Fabric). A direction change
 * landing mid-exit re-points the outgoing page's offsets in place, mirroring
 * the legacy `custom` channel. The first render never animates
 * (`initial={false}` in the legacy wiring), and under `isTestEnv()` pages
 * swap instantly so consumer suites stay synchronous.
 *
 * One deliberate simplification vs legacy: re-requesting a page while it is
 * still exiting lets the exit finish and then re-enters it, instead of
 * reversing mid-flight — with `exitBeforeEnter` sequencing the two are nearly
 * indistinguishable, and pager keys rarely thrash.
 */
export function TransitionItem({
  animationType = 'fade',
  childKey,
  curve = DEFAULT_PAGER_CURVE,
  distance = DEFAULT_PAGER_DISTANCE,
  disableFade = false,
  children,
}: TransitionItemProps): JSX.Element {
  // Falsy children exit the current page and render nothing, like the legacy
  // `{children && <AnimatedItem …>}` conditional.
  const incomingKey: PagerKey | null = children ? (childKey ?? 'animated-item') : null

  const [, forceRender] = useReducer((tick: number) => tick + 1, 0)
  const stateRef = useRef<PagerState | null>(null)
  if (stateRef.current === null) {
    stateRef.current = {
      key: incomingKey,
      frozen: children,
      phase: 'idle',
      pendingKey: null,
      exitArmed: false,
      enterPending: false,
    }
  }
  const s = stateRef.current

  // Latest transition config, read by the completion callback so the incoming
  // page mounts with whatever direction is current at that moment.
  const configRef = useRef({ animationType, distance, curve, disableFade })
  configRef.current = { animationType, distance, curve, disableFade }

  // Presentation values, animated DIRECTLY toward their targets — always
  // from wherever they currently are, so an interrupt (a swap landing
  // mid-enter, a direction change mid-exit) is continuous by construction
  // instead of jumping through a progress*offset re-derivation.
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const pageOpacity = useSharedValue(1)
  /**
   * Completion clock for the exit (1 = at rest, 0 = exit finished). Style
   * reads none of it; it exists so the completion callback survives mid-exit
   * re-points — re-targeting translateX/translateY starts new animations on
   * those values, which would cancel a callback attached to them.
   */
  const progress = useSharedValue(1)

  /**
   * Applies the pending page: called from the exit completion (via runOnJS)
   * and from the deferred-mount effect. Seeds the shared values before the
   * content commits, so the incoming page's first painted frame is already
   * offset and transparent (SegmentedControl indicator-mount precedent).
   */
  const mountPending = useEvent((): void => {
    if (s.phase !== 'exiting' && !s.enterPending) {
      // Stale completion: its clock was restarted (mid-exit re-point) or the
      // swap already happened — nothing to apply. Real Reanimated fires
      // cancelled callbacks with finished=false, so this is belt-and-braces
      // against any completion that slips through after the fact.
      return
    }
    const pending = s.pendingKey
    s.pendingKey = null
    s.phase = 'idle'
    s.exitArmed = false
    s.enterPending = false
    s.key = pending
    progress.value = 1
    if (pending !== null) {
      const { enterOffset } = getAnimationOffsets(configRef.current.animationType, configRef.current.distance)
      translateX.value = enterOffset.x
      translateY.value = enterOffset.y
      pageOpacity.value = configRef.current.disableFade ? 1 : 0
      translateX.value = withSporeCurve(configRef.current.curve, 0)
      translateY.value = withSporeCurve(configRef.current.curve, 0)
      if (!configRef.current.disableFade) {
        pageOpacity.value = withSporeCurve(configRef.current.curve, 1)
      }
    } else {
      s.frozen = null
      translateX.value = 0
      translateY.value = 0
      pageOpacity.value = 1
    }
    forceRender()
  })

  /**
   * Exit presentation, from the LIVE props (single source of truth for the
   * arm and re-point paths): slide toward the exit offsets and resolve the
   * fade — always from wherever the values currently are, so interrupts stay
   * continuous. Animating to 1 under disableFade is a settled no-op spring
   * when the fade never started, and the web-parity re-resolution when a
   * mid-exit config change flipped it.
   */
  const applyExitPresentation = useEvent((): void => {
    const { exitOffset } = getAnimationOffsets(animationType, distance)
    translateX.value = withSporeCurve(curve, exitOffset.x)
    translateY.value = withSporeCurve(curve, exitOffset.y)
    pageOpacity.value = withSporeCurve(curve, disableFade ? 1 : 0)
  })

  /**
   * (Re)starts the exit completion clock, aligned with whatever presentation
   * run just started: a mid-exit re-point restarts the presentation on
   * fresh full-length curves, so the clock must restart with them — its
   * original run would otherwise swap the page mid-flight of the re-pointed
   * motion. Replacing the running clock cancels the old callback
   * (finished=false), which the guard below ignores.
   */
  const startCompletionClock = useEvent((): void => {
    progress.value = 1
    progress.value = withSporeCurve(curve, 0, (finished) => {
      // The directive is load-bearing (iOS Fabric hard crash without it):
      // Reanimated's babel plugin only auto-workletizes callbacks passed
      // DIRECTLY to its own APIs (withSpring/withTiming/...), not ones routed
      // through a user-land helper like withSporeCurve — and the completion
      // callback runs on the UI runtime, where a plain JS function throws.
      'worklet'
      if (finished === true) {
        runOnJS(mountPending)()
      }
    })
  })

  // Render-phase page-swap machine (an effect would run after React already
  // re-rendered with the new content under the old key). Every branch is
  // idempotent under replayed renders — the same inputs recreate the same
  // state.
  if (s.phase === 'idle') {
    if (incomingKey === s.key) {
      // Same page: render live content below and keep the frozen copy fresh
      // for a future exit. A deferred mount that lost its page again before
      // mounting (key back to null) just re-points the pending mount.
      s.frozen = children
      if (s.enterPending) {
        s.pendingKey = incomingKey
      }
    } else if (isTestEnv()) {
      s.key = incomingKey
      s.frozen = children
    } else if (s.key === null) {
      s.pendingKey = incomingKey
      s.enterPending = true
    } else {
      s.phase = 'exiting'
      s.pendingKey = incomingKey
      s.exitArmed = false
    }
  } else {
    // Already exiting: the newest request wins at completion.
    s.pendingKey = incomingKey
  }

  // Arm the exit once per exit phase, post-commit. The presentation values
  // animate from wherever they currently are (usually at rest; mid-enter on
  // an interrupt), so the outgoing frame never snaps.
  useEffect(() => {
    if (s.phase !== 'exiting' || s.exitArmed) {
      return
    }
    s.exitArmed = true
    applyExitPresentation()
    startCompletionClock()
  })

  // Deferred mount (empty → page): seed values + mount in one post-commit
  // step. Runs after the arming effect so an exit started this commit wins.
  useEffect(() => {
    if (s.phase === 'idle' && s.enterPending) {
      mountPending()
    }
  })

  // A config change landing mid-exit re-points the outgoing page — slide
  // toward the new offsets AND re-resolve the fade — restarting the
  // completion clock alongside, since the re-pointed presentation runs fresh
  // full-length curves (an unrestarted clock would swap the page mid-flight
  // of the re-pointed motion). This is the legacy `custom={{ going }}`
  // contract; the web leg's getPagerExitProps re-resolves the exiting
  // clone's offset and opacity custom properties from the live `custom` the
  // same way (web keeps its original CSS clock only because the running
  // keyframe re-targets WITHIN its remaining time, which springs can't do).
  useEffect(() => {
    if (s.phase !== 'exiting' || !s.exitArmed) {
      return
    }
    applyExitPresentation()
    startCompletionClock()
  }, [animationType, distance, disableFade, curve, applyExitPresentation, startCompletionClock, s])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      // Spore springs overshoot past 1 on enter and undershoot below 0 on
      // exit: clamp opacity both ends, let the slide bounce.
      opacity: Math.max(0, Math.min(1, pageOpacity.value)),
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    }
  }, [pageOpacity, translateX, translateY])

  if (s.key === null) {
    return <></>
  }

  return (
    // Keyed by the rendered page: a swap remounts the subtree, matching the
    // web leg's keyed page div — same-type pages must not leak component
    // state (useState/TextInput/scroll) across a transition.
    <Animated.View
      key={String(s.key)}
      style={[WRAPPER_STYLE, s.phase === 'exiting' ? EXITING_STYLE : undefined, animatedStyle]}
    >
      {s.phase === 'exiting' ? s.frozen : children}
    </Animated.View>
  )
}

/** Native `AnimateTransition`: `TransitionItem` keyed by `currentIndex`, rendering that child. */
export function AnimateTransition({
  currentIndex,
  animationType = 'fade',
  curve = DEFAULT_PAGER_CURVE,
  distance,
  disableFade,
  children,
}: AnimateTransitionProps): JSX.Element {
  const childrenArray = Children.toArray(children)
  return (
    <TransitionItem
      childKey={`slide-item-${currentIndex}`}
      animationType={animationType}
      curve={curve}
      distance={distance}
      disableFade={disableFade}
    >
      {childrenArray[currentIndex]}
    </TransitionItem>
  )
}

/** Native `AnimatedPager`: `AnimateTransition` sliding `forward`/`backward` as `currentIndex` moves. */
export function AnimatedPager({
  currentIndex,
  curve,
  distance,
  disableFade,
  children,
}: AnimatedPagerProps): JSX.Element {
  const direction = usePagerDirection(currentIndex)
  return (
    <AnimateTransition
      animationType={direction}
      currentIndex={currentIndex}
      curve={curve}
      distance={distance}
      disableFade={disableFade}
    >
      {children}
    </AnimateTransition>
  )
}
