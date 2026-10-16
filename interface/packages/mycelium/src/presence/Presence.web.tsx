/* oxlint-disable max-lines -- the INFRA-3778 exit-state pinning pushed this file just past the cap; splitting Presence is a follow-up */
import { isTestEnv } from '@universe/environment'
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  type CSSProperties,
  type JSX,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useEvent } from 'utilities/src/react/hooks'
import { cn } from '../cn'
import { hasExitAnimationName } from '../compat/animations'
import { reportFragmentChildren, reportMissingExitAnimation, reportUnobservableExit } from './exit-diagnostics'
import type { PresenceExitProps, PresenceProps } from './PresenceProps'

/**
 * Fallback unmount deadline for an exiting child whose `animationend` never
 * arrives (no exit classes, `display: none`, an animation interrupted before
 * it finishes). Sized above every shipped exit lane: the exit presets run
 * 200ms and the longest Spore curve is 500ms.
 */
export const PRESENCE_EXIT_TIMEOUT_MS = 600

/**
 * Set on a child's DOM node while `initial={false}` is suppressing its enter
 * animation. `stripEnterClasses` below only catches a literal enter-token
 * `className`; a compat component can also compose an enter class onto the
 * node from one of its own animation-preset props (`../compat/props.ts`),
 * downstream of the `className` this component inspects. This attribute —
 * gated in
 * `@universe/tailwind/css/compat.css`, the same way `data-exiting` gates exit
 * classes — suppresses the animation at the DOM node regardless of how the
 * class got there.
 */
export const PRESENCE_SKIP_ENTER_ATTR = 'data-presence-skip-enter'

type ChildKey = string

interface PresenceChildProps {
  className?: unknown
  style?: unknown
  ref?: unknown
  /** Legacy Tamagui opt-out, honored here: `false` skips the exit hold (see compat/props.ts). */
  animatePresence?: boolean
}

type PresenceElement = ReactElement<PresenceChildProps>

interface ExitingEntry {
  /** The original element as last rendered while present (pre-clone). */
  element: PresenceElement
  /** Render slot the child held when it left, so the clone keeps its position. */
  index: number
  /** Set once the post-commit effect has attached listeners and the deadline. */
  armed: boolean
  cleanup?: () => void
}

/**
 * Enter-preset animation tokens (`animate-spore-enter-*`), with or without
 * variant prefixes — the tokens `initial={false}` strips from a literal
 * `className`. This only reaches classes already present on the incoming
 * element's `className` prop; `PRESENCE_SKIP_ENTER_ATTR` above covers classes
 * a component composes onto the node from other props.
 */
function isEnterToken(token: string): boolean {
  return token.slice(token.lastIndexOf(':') + 1).startsWith('animate-spore-enter-')
}

function stripEnterClasses(className: unknown): string | undefined {
  if (typeof className !== 'string') {
    return undefined
  }
  return className
    .split(/\s+/)
    .filter((token) => token !== '' && !isEnterToken(token))
    .join(' ')
}

/**
 * Flatten to keyed elements. Non-elements (text, numbers) are not
 * presence-managed and are dropped, like the legacy wrapper. The index
 * fallback only supports the single-conditional-child shape — swapping
 * siblings requires explicit keys.
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

/**
 * Applies a child-supplied ref, returning the cleanup function if the ref
 * callback returned one (React 19: `ref={(n) => { ...; return () => ... }}`).
 * Callers must invoke that cleanup instead of calling the ref again with
 * `null` — calling it with `null` after it already returned a cleanup
 * re-runs the setup path's teardown contract incorrectly.
 */
function applyRef(ref: unknown, node: HTMLElement | null): (() => void) | undefined {
  if (typeof ref === 'function') {
    const cleanup: unknown = ref(node)
    return typeof cleanup === 'function' ? (cleanup as () => void) : undefined
  }
  if (ref !== null && typeof ref === 'object' && 'current' in ref) {
    ;(ref as MutableRefObject<HTMLElement | null>).current = node
  }
  return undefined
}

/**
 * Web `Presence`: the runtime half of the shipped `[data-exiting]` exit lane
 * (`EXIT_PRESET_CLASSES` in ../compat/animations, keyframes in
 * `@universe/tailwind/css/compat.css`). Children are diffed by key; a removed
 * child stays mounted as a frozen clone with `data-exiting` set on its DOM
 * node — which activates any `data-exiting:`-gated exit classes the child
 * carries — and unmounts on `animationend`, with
 * {@link PRESENCE_EXIT_TIMEOUT_MS} as the fallback deadline. Under
 * `isTestEnv()` removals unmount immediately, so consumer test suites stay
 * instant.
 *
 * The child must resolve its forwarded ref to its own DOM element (host
 * elements and every compat primitive do); a child that never provides a
 * node unmounts immediately, since its exit can not be observed.
 *
 * `childOwnsNativeAnimation` is inert here by design: shared call sites pass it
 * for the native leg, and this leg's hold is what gives the child's own
 * `data-exiting` lane a frame. It must stay a silent no-op.
 */
export function Presence<TCustom = unknown>({
  children,
  initial = true,
  exitBeforeEnter = false,
  onExitComplete,
  custom,
  getExitProps,
}: PresenceProps<TCustom>): JSX.Element {
  const [, forceRender] = useReducer((tick: number) => tick + 1, 0)
  // Discriminates this instance's exit-diagnostic dedupe keys from every other Presence on the page.
  const instanceId = useId()

  // Per-key lifecycle state lives across the parallel maps/sets below rather
  // than one map keyed by ChildKey, each pruned from its own site (see the
  // effect) — a candidate for consolidation if a future pass has room for it.
  // Until then, this is the state matrix every code path below assumes; check
  // a change against every row before touching arming/finishing/cancellation:
  //
  //  - mounted, normal: absent from exitingRef and skipEnterKeysRef; present
  //    in nodesRef/refCallbacksRef/childRefsRef/refCleanupsRef from mount,
  //    pruned from those on unmount.
  //  - mounted, initial={false} (or a later re-mount that inherited the skip):
  //    same as above, plus present in skipEnterKeysRef.
  //  - exiting, unarmed (just diffed out this render): present in exitingRef
  //    with armed:false; node bookkeeping unchanged; skip-enter unchanged.
  //  - exiting, armed, no exit animation (or animatePresence===false / no
  //    node): finishExit runs synchronously in the same effect pass that
  //    arms it, so this state is not actually observable afterward.
  //  - exiting, armed, animation running: present in exitingRef with
  //    armed:true and cleanup set (listener + deadline); node bookkeeping and
  //    skip-enter unchanged.
  //  - exiting, cancelled (re-added before it finished): still present in
  //    exitingRef — removal deferred to the post-commit drain via
  //    cancelledKeysRef — node bookkeeping and skip-enter unchanged.
  //  - exit completed (finishExit ran: animationend/deadline/shortcut):
  //    absent from exitingRef and skipEnterKeysRef immediately, pruned by
  //    `finishExit` itself; the node hasn't unmounted yet at that point (the
  //    clone is still rendered), so nodesRef/refCallbacksRef/childRefsRef/
  //    refCleanupsRef only clear once `finishExit`'s forceRender drops the
  //    clone from output and the stable ref callback fires with `null`.
  //
  // skipEnterKeysRef only ever clears on a genuine completion — a
  // cancelled-then-drained key that was never marked skip-enter has nothing
  // to clear there, and one that WAS marked stays marked (re-entering doesn't
  // replay the entrance it already skipped).
  const exitingRef = useRef<Map<ChildKey, ExitingEntry>>(new Map())
  /** Present children of the last committed render (post-deferral), original elements. */
  const presentRef = useRef<Map<ChildKey, PresenceElement> | null>(null)
  /** Output key order of the last committed render. */
  const renderedOrderRef = useRef<ChildKey[]>([])
  const nodesRef = useRef<Map<ChildKey, HTMLElement>>(new Map())
  /** Stable per-key callback refs, so React never re-attaches on re-render. */
  const refCallbacksRef = useRef<Map<ChildKey, (node: HTMLElement | null) => void>>(new Map())
  /** Latest child-supplied refs, applied through the stable callbacks. */
  const childRefsRef = useRef<Map<ChildKey, unknown>>(new Map())
  /** Cleanup returned by a child's callback ref, keyed the same way. */
  const refCleanupsRef = useRef<Map<ChildKey, () => void>>(new Map())
  const skipEnterKeysRef = useRef<Set<ChildKey>>(new Set())
  /**
   * Keys cancelled (re-entered) by the most recently RUN render call,
   * rebuilt fresh (assigned, never appended) each render — see the
   * cancellation loop below. Assigning instead of pushing means a discarded
   * render (StrictMode's double-invoke, a superseded/interrupted update)
   * can't leak stale cancellations forward: a commit is always produced by
   * the LAST render call to run before it, so that call's assignment is the
   * one left standing by the time anything outside render observes this ref.
   * That "outside render" reader is `finishExit`: checking this ref there
   * closes the window between this commit and the post-commit drain below
   * where a cancelled key's own stale animationend/deadline — still armed
   * from before it re-entered — would otherwise find the (not yet drained)
   * `exiting` entry and wrongly finish an exit the cancellation already owns.
   */
  const cancelledKeysRef = useRef<Set<ChildKey>>(new Set())
  /**
   * Set by `finishExit` when a genuine completion (animationend, the
   * deadline, or one of the immediate no-animation/no-node shortcuts below)
   * leaves other entries still in `exiting` — either still genuinely exiting,
   * or already-cancelled entries the post-commit drain hasn't removed yet.
   * Cleared the moment `exiting` actually empties, by whichever side notices
   * first (`finishExit` itself, or the drain below). A pure cancellation
   * never sets this, so draining a cancelled key to an empty `exiting` on its
   * own — nothing having genuinely completed — must not fire the callback.
   */
  const pendingExitCompletionRef = useRef(false)
  /**
   * Nodes whose exit finished while their clone was still rendered, holding
   * the exit end state inline (INFRA-3778). `finishExit` drops the key from
   * `exiting`, which un-gates `data-exiting` on a node React has not
   * unmounted yet: the exit lane's `forwards` fill goes with the attribute, so
   * the outgoing content would snap back to its resting opacity and sit there
   * at full strength until the replacement commit lands. Under
   * `exitBeforeEnter` that wait is however long the incoming child takes,
   * which is what made the Portfolio tab pager visibly round-trip. Released
   * in the drain below, on the commit that unmounts the node or re-admits the
   * key as a live child. Each entry keeps the node's own prior inline values,
   * so releasing the pin restores a consumer's inline `opacity`/`transform`
   * instead of deleting it (React will not re-write an unchanged style prop).
   */
  const pinnedExitNodesRef = useRef<Map<ChildKey, { node: HTMLElement; priorOpacity: string; priorTransform: string }>>(
    new Map(),
  )

  const finishExit = useEvent((key: ChildKey): void => {
    if (cancelledKeysRef.current.has(key)) {
      // A cancellation already claims this entry (re-entered this commit,
      // not yet drained below) — the drain owns removing it, not a stale
      // animationend/deadline still pending from before the re-entry.
      return
    }
    const entry = exitingRef.current.get(key)
    if (entry === undefined) {
      return
    }
    const node = nodesRef.current.get(key)
    if (node !== undefined && node.hasAttribute('data-exiting')) {
      // Freeze what the exit lane is currently showing before `cleanup` pulls
      // `data-exiting` (and with it the animation holding this state) off a
      // node that is still on screen. Read from the computed style rather than
      // reconstructed from `getExitProps`, so this covers every consumer's
      // exit lane and not just the parameterized pager keyframes.
      const priorOpacity = node.style.getPropertyValue('opacity')
      const priorTransform = node.style.getPropertyValue('transform')
      const settled = getComputedStyle(node)
      node.style.opacity = settled.opacity
      node.style.transform = settled.transform
      pinnedExitNodesRef.current.set(key, { node, priorOpacity, priorTransform })
    }
    entry.cleanup?.()
    exitingRef.current.delete(key)
    // Not nodesRef: the node hasn't unmounted (the presence clone stays
    // rendered until forceRender's next pass drops it), so the ref callback
    // never fires again for this key — deleting the entry here would orphan
    // it permanently. The callback's own `null` call handles that on the
    // real unmount.
    skipEnterKeysRef.current.delete(key)
    forceRender()
    pendingExitCompletionRef.current = true
    if (exitingRef.current.size === 0) {
      pendingExitCompletionRef.current = false
      onExitComplete?.()
    }
  })

  function refFor(key: ChildKey): (node: HTMLElement | null) => void {
    let callback = refCallbacksRef.current.get(key)
    if (callback === undefined) {
      callback = (node: HTMLElement | null): void => {
        if (node === null) {
          nodesRef.current.delete(key)
          // React 19: if the last call to this ref returned a cleanup
          // function, that cleanup replaces the `null` call entirely.
          const cleanup = refCleanupsRef.current.get(key)
          if (cleanup !== undefined) {
            refCleanupsRef.current.delete(key)
            cleanup()
            return
          }
        } else {
          nodesRef.current.set(key, node)
          if (skipEnterKeysRef.current.has(key)) {
            // Set directly on the DOM node — like `data-exiting` below — so
            // it suppresses the animation regardless of whether the child
            // component forwards this prop anywhere. Runs once, at mount
            // (this callback is stable and React only calls it again on
            // unmount), synchronously during commit, before the browser's
            // first paint of the node.
            node.setAttribute(PRESENCE_SKIP_ENTER_ATTR, '')
          }
        }
        const cleanup = applyRef(childRefsRef.current.get(key), node)
        if (cleanup !== undefined) {
          refCleanupsRef.current.set(key, cleanup)
        }
      }
      refCallbacksRef.current.set(key, callback)
    }
    return callback
  }

  const currentChildren = keyedChildren(children)
  const currentKeys = new Set(currentChildren.map(([key]) => key))
  const exiting = exitingRef.current
  const previousPresent = presentRef.current

  // First render with initial={false}: pin the initial keys so their enter
  // classes stay stripped while mounted.
  if (previousPresent === null && !initial) {
    for (const [key] of currentChildren) {
      skipEnterKeysRef.current.add(key)
    }
  }

  // Render-phase diff (an effect would run after React already unmounted the
  // removed child): a key in the last committed render but absent from
  // `children` starts exiting now. Idempotent under replayed renders — the
  // same inputs recreate the same entries.
  if (previousPresent !== null) {
    for (const [key, element] of previousPresent) {
      if (!currentKeys.has(key) && !exiting.has(key)) {
        exiting.set(key, { element, index: renderedOrderRef.current.indexOf(key), armed: false })
      }
    }
  }
  // A key that re-entered cancels its exit. Only read `exiting` here — never
  // mutate it — so this stays idempotent under a replayed render (a
  // StrictMode double-render, or a discarded concurrent render): removing the
  // entry during render would leave a later replay of the SAME inputs
  // reading an `exiting` that already lost it, so that replay wouldn't
  // recognize the cancellation and would drop the re-entering child under
  // `exitBeforeEnter` instead. The actual removal and any armed entry's DOM
  // cleanup happen post-commit, from the keys queued below.
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
  // of `exiting` above (re-entered this same render) is already present,
  // not a new mount, so it's admitted even though it predates
  // `previousPresent` catching up.
  const renderablePairs =
    exitBeforeEnter && stillExitingCount > 0
      ? currentChildren.filter(([key]) => previousPresent?.has(key) === true || cancelledKeysThisRender.has(key))
      : currentChildren

  const exitProps: PresenceExitProps | undefined = stillExitingCount > 0 ? getExitProps?.(custom) : undefined

  const output: Array<{ key: ChildKey; element: PresenceElement }> = renderablePairs.map(([key, element]) => {
    childRefsRef.current.set(key, element.props.ref)
    const config: Record<string, unknown> = { key, ref: refFor(key) }
    if (skipEnterKeysRef.current.has(key)) {
      const stripped = stripEnterClasses(element.props.className)
      if (stripped !== undefined) {
        config['className'] = stripped
      }
    }
    return { key, element: cloneElement(element, config) }
  })

  // Excludes cancelled keys: `exiting` itself still holds them (the removal
  // is deferred, see above) but this render's output must treat them as
  // present children, not exit clones.
  const orderedExits = [...exiting.entries()]
    .filter(([key]) => !cancelledKeysThisRender.has(key))
    .sort((a, b) => a[1].index - b[1].index)
  for (const [key, entry] of orderedExits) {
    childRefsRef.current.set(key, entry.element.props.ref)
    const config: Record<string, unknown> = { key, ref: refFor(key) }
    let className = typeof entry.element.props.className === 'string' ? entry.element.props.className : undefined
    if (skipEnterKeysRef.current.has(key)) {
      className = stripEnterClasses(className)
    }
    if (exitProps?.className !== undefined) {
      className = cn(className, exitProps.className)
    }
    if (className !== entry.element.props.className && className !== undefined) {
      config['className'] = className
    }
    if (exitProps?.style !== undefined) {
      const baseStyle = entry.element.props.style
      config['style'] = {
        ...(typeof baseStyle === 'object' && baseStyle !== null ? (baseStyle as CSSProperties) : undefined),
        ...exitProps.style,
      }
    }
    const clone = cloneElement(entry.element, config)
    const at = entry.index < 0 ? output.length : Math.min(entry.index, output.length)
    output.splice(at, 0, { key, element: clone })
  }

  const renderedOrder = output.map((item) => item.key)

  // Layout effect, not a passive one (INFRA-3778): this is what arms the exit
  // animation by setting `data-exiting` on the outgoing node. A passive
  // effect runs after the browser paints the commit that first renders the
  // exit clone, so that commit could paint one frame with the node still in
  // its resting (unanimated) state — an exit-lane transition (e.g. the
  // Portfolio tab pager) would then visibly stutter before sliding, instead
  // of sliding from frame one. The layout effect runs before that paint.
  useLayoutEffect(() => {
    reportFragmentChildren(renderablePairs, instanceId)

    // Committed bookkeeping the next render's diff reads.
    presentRef.current = new Map(renderablePairs)
    renderedOrderRef.current = renderedOrder

    // The actual `exiting` removal for a cancelled key, deferred from render.
    // Reads the same set `finishExit` guards against above, then clears it —
    // once this drain runs, that guard's job here is done.
    for (const key of cancelledKeysRef.current) {
      const entry = exitingRef.current.get(key)
      if (entry === undefined) {
        continue
      }
      entry.cleanup?.()
      exitingRef.current.delete(key)
    }
    cancelledKeysRef.current = new Set()

    // Release a pinned exit end state once holding it can no longer be seen:
    // the node has left the document, or its key is a live child again (a
    // re-entry that reused the clone's host node, which must paint normally).
    // Restore the values the pin overwrote rather than removing them, so a
    // consumer's own inline `opacity`/`transform` survives the round trip.
    for (const [key, { node, priorOpacity, priorTransform }] of pinnedExitNodesRef.current) {
      if (node.isConnected && !presentRef.current.has(key)) {
        continue
      }
      if (priorOpacity === '') {
        node.style.removeProperty('opacity')
      } else {
        node.style.setProperty('opacity', priorOpacity)
      }
      if (priorTransform === '') {
        node.style.removeProperty('transform')
      } else {
        node.style.setProperty('transform', priorTransform)
      }
      pinnedExitNodesRef.current.delete(key)
    }
    // A completion (`finishExit`, from `animationend`/the deadline) can land
    // before this drain runs, while a cancellation it's still waiting on
    // hasn't been removed yet — `finishExit` then leaves the flag set instead
    // of firing. Draining that cancellation here is what finally empties
    // `exiting`, so this is where the deferred callback fires. A tick with no
    // genuine completion at all (the flag never set) drains cancellations
    // down to empty without firing anything, by design.
    if (pendingExitCompletionRef.current && exitingRef.current.size === 0) {
      pendingExitCompletionRef.current = false
      onExitComplete?.()
    }

    // Prune ref bookkeeping only after the unmount commit, so the stable
    // callback still reaches the child's own ref for its `null` call.
    const liveKeys = new Set(renderedOrder)
    for (const key of refCallbacksRef.current.keys()) {
      if (!liveKeys.has(key)) {
        refCallbacksRef.current.delete(key)
        childRefsRef.current.delete(key)
        refCleanupsRef.current.delete(key)
      }
    }

    // Consumer test suites stay instant, like the legacy wrapper (the
    // HeightAnimator precedent) — removals unmount without the exit hold.
    const skipAnimation = isTestEnv()
    for (const [key, entry] of exitingRef.current) {
      if (entry.armed) {
        continue
      }
      entry.armed = true
      const node = nodesRef.current.get(key)
      if (node === undefined || skipAnimation || entry.element.props.animatePresence === false) {
        reportUnobservableExit({ element: entry.element, key, node, instantLane: skipAnimation, instanceId })
        finishExit(key)
        continue
      }
      node.setAttribute('data-exiting', '')
      if (!hasExitAnimationName(getComputedStyle(node).animationName)) {
        // data-exiting didn't resolve to an exit-family name — no exit lane
        // to run. Covers a plain child with no animation at all ('none'),
        // AND a child whose only animation is an unrelated one (an
        // already-finished mount animation with no exit preset registered,
        // or any other name outside the exit family) — `animationend` for
        // that name would never fire the exit family, so waiting on it would
        // just occupy layout for the full PRESENCE_EXIT_TIMEOUT_MS. Finish
        // now instead.
        reportMissingExitAnimation({
          type: entry.element.type,
          key,
          className: node.getAttribute('class') ?? '',
          instanceId,
        })
        node.removeAttribute('data-exiting')
        finishExit(key)
        continue
      }
      // animationend only — not animationcancel. Changing `animation-name`
      // fires cancel, which happens when `data-exiting` interrupts a
      // still-running enter animation, or when the `custom` channel
      // re-resolves exit classes mid-flight; neither means the exit
      // finished. A genuinely stuck animation still unmounts via the
      // PRESENCE_EXIT_TIMEOUT_MS deadline below.
      const handleAnimationEnd = (event: AnimationEvent): void => {
        // Only the child's own exit-family animation ends the hold —
        // descendants' animations bubble here too, and an unrelated
        // animation (e.g. an enter animation still resolving on this same
        // node) may still emit its own animationend after data-exiting was
        // set.
        if (event.target === node && hasExitAnimationName(event.animationName)) {
          finishExit(key)
        }
      }
      node.addEventListener('animationend', handleAnimationEnd)
      const deadline = setTimeout(() => finishExit(key), PRESENCE_EXIT_TIMEOUT_MS)
      entry.cleanup = (): void => {
        clearTimeout(deadline)
        node.removeEventListener('animationend', handleAnimationEnd)
        node.removeAttribute('data-exiting')
      }
    }
  })

  useEffect(() => {
    const exitingAtMount = exitingRef.current
    return () => {
      for (const entry of exitingAtMount.values()) {
        entry.cleanup?.()
      }
      exitingAtMount.clear()
    }
  }, [])

  // A transparent list, not a wrapper element: Presence must not change the
  // children's layout context.
  return <>{output.map((item) => item.element)}</>
}
