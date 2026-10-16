import { RefObject, useEffect, useRef } from 'react'
import {
  COLLAPSE_PROGRESS_VAR,
  COLLAPSE_SCROLL_RANGE_PX,
  COLLAPSE_TEXT_VISIBILITY_VAR,
  COLLAPSE_TOUCH_ACTION_VAR,
  getTokenColumnWidthPx,
  TEXT_FADE_END_PROGRESS,
  TOKEN_COLUMN_SHRINK_PX,
} from '~/pages/Launches/tokenColumnCollapse'

/**
 * Rows get this much narrower across a full collapse: the column gives up `TOKEN_COLUMN_SHRINK_PX`
 * while the consumed-scroll margin adds `COLLAPSE_SCROLL_RANGE_PX` back. Row width is
 * `fit-content` (`TableRowBase`), so this really does shrink `scrollWidth` — hence the room cap
 * below, which keeps the shrink from clamping `scrollLeft` and oscillating.
 */
const ROW_WIDTH_LOSS_PX = TOKEN_COLUMN_SHRINK_PX - COLLAPSE_SCROLL_RANGE_PX

/** Scroll room to leave beyond the current position before collapsing further (see ROW_WIDTH_LOSS_PX). */
const SCROLL_ROOM_BUFFER_PX = 24

/**
 * How long a scroll still reads as belonging to the last input after that input goes quiet.
 * Momentum after a flick fires no input events at all, so every accepted scroll re-arms the window
 * and the tail stays covered; only a real lull — or a scroll with no input behind it — closes it.
 */
const INPUT_GESTURE_WINDOW_MS = 400

/** Keys that scroll a container. Tab is deliberately absent: focus scrolling is `scrollIntoView`, not intent. */
const SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'])

/**
 * Scroll-linked collapse of the launch table's pinned token column on mobile. Attach the returned
 * ref to an element wrapping the shared `Table`: a capture-phase scroll listener picks up the
 * table's scroll-synced header and body containers without reaching into Table internals, and an
 * rAF-throttled handler writes progress to CSS custom properties — no per-frame React renders, and
 * no CSS transitions, so `prefers-reduced-motion` has nothing extra to suppress (the interpolation
 * is scroll-driven, i.e. direct manipulation).
 *
 * Interaction model:
 * - **The transition is paid for before the content scrolls.** Progress is the gesture travel the
 *   collapse has consumed, and that same distance is rendered as margin after the pinned column
 *   (`getConsumedScrollMarginCss`). Because the margin grows by exactly what `scrollLeft` advanced,
 *   the data columns hold still against the pinned column's right edge — they only begin sliding
 *   underneath it once the column is fully collapsed. Nothing here writes `scrollLeft`, so there is
 *   no fight with compositor-driven momentum or rubber-banding on iOS, and no feedback loop between
 *   our own writes and the scroll handler.
 * - **Directional, not position-mapped.** Progress accumulates signed gesture travel, so the column
 *   re-grows wherever you are in the table rather than only inside the first 100px of scroll.
 * - **Re-growing is scoped to the collapsed column.** A drag that starts on the collapsed column
 *   grows it back; a drag that starts anywhere else scrolls the table normally and leaves the column
 *   collapsed. Collapsing on the way in still works from anywhere.
 * - **Only scrolls with an input gesture behind them count as intent.** Travel is gated on the
 *   *source* of the scroll, not its size: a scroll is read as intent while an input gesture that
 *   started inside a scroll pane is in flight (see `INPUT_GESTURE_WINDOW_MS`). Programmatic scrolls
 *   — `TableSideScrollButtons`' smooth `scrollTo`, `scrollIntoView`, a resize clamp — arrive with no
 *   gesture in flight and only re-clamp the existing progress. Sizing the gate by delta magnitude
 *   instead would swallow a fast flick whose travel got coalesced across a dropped frame.
 * - Progress is additionally capped at `scrollLeft`, which keeps two invariants: the column is
 *   always fully expanded at scroll start (no collapsed column at home), and the consumed-scroll
 *   margin can never exceed the scroll that actually exists (no gap beside the pinned column).
 */
export function useTokenColumnCollapse({ enabled }: { enabled: boolean }): RefObject<HTMLElement | null> {
  const rootRef = useRef<HTMLElement>(null)

  // Progress state lives in refs so it survives an effect re-attach (breakpoint flip, HMR, a
  // re-render mid-gesture): re-attaching re-derives and re-applies the current collapse instead of
  // dropping the custom property and snapping the column back open.
  const consumedPxRef = useRef(0)
  const scrollLeftRef = useRef(0)
  // The scroll container outlives the effect too, so a re-attach can read the live scroll position
  // rather than trust `scrollLeftRef` — only scroll events write that one.
  const scrollerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!enabled || !(root instanceof HTMLElement)) {
      return undefined
    }

    let frame: number | null = null
    let appliedProgress: number | null = null
    /** True while the in-flight gesture began on the (at least partly) collapsed pinned column. */
    let expandArmed = false
    /** `performance.now()` up to which scrolls still count as user-driven. */
    let gestureUntil = 0
    /** Finger x of the last consumed `onGrowMove` step; non-null only while a grow drag owns the gesture. */
    let growLastX: number | null = null
    let growOriginX = 0
    let growOriginY = 0

    const isUserScroll = (): boolean => performance.now() < gestureUntil
    const extendGesture = (): void => {
      gestureUntil = performance.now() + INPUT_GESTURE_WINDOW_MS
    }

    const currentProgress = (): number =>
      Math.min(consumedPxRef.current, scrollLeftRef.current) / COLLAPSE_SCROLL_RANGE_PX

    const apply = (): void => {
      const progress = currentProgress()
      if (progress === appliedProgress) {
        return
      }
      appliedProgress = progress
      root.style.setProperty(COLLAPSE_PROGRESS_VAR, progress.toFixed(4))
      // Once the name/symbol have fully faded, drop them out of the accessibility tree too.
      root.style.setProperty(COLLAPSE_TEXT_VISIBILITY_VAR, progress >= TEXT_FADE_END_PROGRESS ? 'hidden' : 'visible')
      // Hand horizontal panning on the collapsed column to `onGrowMove` (see COLLAPSE_TOUCH_ACTION_VAR).
      root.style.setProperty(COLLAPSE_TOUCH_ACTION_VAR, progress > 0 ? 'pan-y' : 'auto')
      if (progress === 0) {
        expandArmed = false
      }
    }

    /**
     * Ceiling on how much further the column may collapse: each additional step costs the rows
     * `ROW_WIDTH_LOSS_PX` of width, and collapsing past the available scroll room would clamp
     * `scrollLeft` down, re-expanding the column and oscillating.
     */
    const maxConsumedPx = (scrollLeft: number): number => {
      if (ROW_WIDTH_LOSS_PX <= 0) {
        return COLLAPSE_SCROLL_RANGE_PX
      }
      const scroller = scrollerRef.current
      const roomPx = (scroller?.scrollWidth ?? 0) - (scroller?.clientWidth ?? 0) - scrollLeft - SCROLL_ROOM_BUFFER_PX
      const headroomProgress = Math.max(roomPx, 0) / ROW_WIDTH_LOSS_PX
      return Math.min(currentProgress() + headroomProgress, 1) * COLLAPSE_SCROLL_RANGE_PX
    }

    const update = (): void => {
      frame = null
      const scroller = scrollerRef.current
      if (!scroller) {
        return
      }
      const scrollLeft = scroller.scrollLeft
      // The synced header and body containers share a scroll position, so one accumulator covers both.
      const delta = scrollLeft - scrollLeftRef.current
      scrollLeftRef.current = scrollLeft

      if (delta !== 0 && isUserScroll()) {
        // Momentum fires no input events, so the gesture's own scrolling holds its window open.
        extendGesture()
        if (delta > 0) {
          // Way in, from anywhere: spend the gesture collapsing before the content scrolls.
          consumedPxRef.current = Math.min(
            consumedPxRef.current + delta,
            COLLAPSE_SCROLL_RANGE_PX,
            maxConsumedPx(scrollLeft),
          )
        } else if (expandArmed) {
          // Gesture began on the collapsed column: spend it growing the column back.
          consumedPxRef.current = Math.max(consumedPxRef.current + delta, 0)
        }
        // Any other leftward travel scrolls the table and leaves the column as it is.
      }

      // Always re-derive: a scroll with no gesture behind it keeps the accumulated progress but
      // re-clamps against the new position, so jumping home expands fully and jumping away restores
      // the collapse.
      apply()
    }

    const onScroll = (event: Event): void => {
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }
      scrollerRef.current = target
      if (frame === null) {
        frame = requestAnimationFrame(update)
      }
    }

    /**
     * Inputs only count when they land inside a scrolling region. `TableSideScrollButtons` renders
     * into an absolutely positioned overlay outside both scroll panes, so pressing one never opens a
     * gesture window and its smooth `scrollTo` stays programmatic.
     */
    const startsInScroller = (event: Event): boolean => {
      const target = event.target
      // `Element`, not `HTMLElement`: a drag starting on an icon (DeltaArrow, the logo's chain badge)
      // targets an SVGElement. `parentElement` and `getComputedStyle` behave the same on both.
      let node: Element | null = target instanceof Element ? target : null
      while (node && root.contains(node)) {
        const overflowX = getComputedStyle(node).overflowX
        if (overflowX === 'auto' || overflowX === 'scroll') {
          return true
        }
        node = node.parentElement
      }
      return false
    }

    /** jsdom (and any environment without Touch Events) doesn't define `TouchEvent`. */
    const asTouchEvent = (event: Event): TouchEvent | null =>
      typeof TouchEvent !== 'undefined' && event instanceof TouchEvent ? event : null

    const gestureClientX = (event: Event): number | null => {
      if (event instanceof MouseEvent) {
        return event.clientX
      }
      const touch = asTouchEvent(event)?.touches.item(0)
      return touch ? touch.clientX : null
    }

    /**
     * The collapsed column absorbs a horizontal drag that starts on it, rather than growing back
     * *while* the table scrolls. `COLLAPSE_TOUCH_ACTION_VAR` stops the browser panning horizontally
     * from the pinned cells, so no scroll events arrive and the travel has to come from the finger:
     * `scrollLeft` holds still while `consumed` drains, which walks progress down to 0 with the
     * table not moving at all. Attached only for an armed gesture, so ordinary horizontal scrolling
     * keeps its passive fast path.
     */
    const onGrowMove = (event: Event): void => {
      const touchEvent = asTouchEvent(event)
      if (!touchEvent || growLastX === null) {
        return
      }
      const touch = touchEvent.touches.item(0)
      if (!touch) {
        return
      }
      // Leave a predominantly vertical drag to the browser — `pan-y` still allows page scrolling.
      if (Math.abs(touch.clientY - growOriginY) > Math.abs(touch.clientX - growOriginX)) {
        return
      }
      if (event.cancelable) {
        event.preventDefault()
      }
      const step = touch.clientX - growLastX
      growLastX = touch.clientX
      extendGesture()
      // Finger right grows the column back, finger left re-collapses it; same clamps as scroll travel.
      consumedPxRef.current =
        step > 0
          ? Math.max(consumedPxRef.current - step, 0)
          : Math.min(consumedPxRef.current - step, COLLAPSE_SCROLL_RANGE_PX, maxConsumedPx(scrollLeftRef.current))
      apply()
    }

    const endGrowDrag = (): void => {
      growLastX = null
      root.removeEventListener('touchmove', onGrowMove, { capture: true })
    }

    /**
     * Arm the re-grow only for gestures starting on the collapsed column. Deliberately not cleared
     * on pointerup: momentum after the finger lifts belongs to the same gesture. It is cleared by
     * the next gesture starting elsewhere, and by the column reaching fully expanded.
     */
    const onGestureStart = (event: Event): void => {
      const inScroller = startsInScroller(event)
      if (inScroller) {
        extendGesture()
      }
      const clientX = gestureClientX(event)
      if (clientX === null) {
        return
      }
      const progress = currentProgress()
      // Hit-test against the same width curve the cells paint, so the arming region tracks the edge.
      const pinnedRightEdge =
        (scrollerRef.current ?? root).getBoundingClientRect().left + getTokenColumnWidthPx(progress)
      expandArmed = inScroller && progress > 0 && clientX <= pinnedRightEdge

      const touch = asTouchEvent(event)?.touches.item(0) ?? null
      if (expandArmed && touch) {
        growOriginX = touch.clientX
        growOriginY = touch.clientY
        growLastX = touch.clientX
        root.addEventListener('touchmove', onGrowMove, { capture: true, passive: false })
      } else {
        endGrowDrag()
      }
    }

    /** Keeps a slow or paused drag armed — `touchmove` and `wheel` keep firing where scroll events pause. */
    const onInputActivity = (event: Event): void => {
      if (isUserScroll() || startsInScroller(event)) {
        extendGesture()
      }
    }

    const onKeyDown = (event: Event): void => {
      if (event instanceof KeyboardEvent && SCROLL_KEYS.has(event.key) && startsInScroller(event)) {
        extendGesture()
      }
    }

    // Only scroll events write `scrollLeftRef`, so on a re-attach that followed a resize (breakpoint
    // flip, rotation) it can hold a position the browser has since clamped away — leaving the column
    // collapsed at rest with a consumed-scroll margin no longer hidden beneath it. Seed from the live
    // scroller instead, and clamp consumed to it so a later grow-back has no invisible excess to burn.
    const attachedScroller = scrollerRef.current
    scrollerRef.current = attachedScroller && root.contains(attachedScroller) ? attachedScroller : null
    scrollLeftRef.current = scrollerRef.current?.scrollLeft ?? 0
    consumedPxRef.current = Math.min(consumedPxRef.current, scrollLeftRef.current)
    // Re-apply on attach so a re-run mid-scroll restores the current collapse rather than resetting it.
    apply()

    root.addEventListener('scroll', onScroll, { capture: true, passive: true })
    root.addEventListener('pointerdown', onGestureStart, { capture: true, passive: true })
    root.addEventListener('touchstart', onGestureStart, { capture: true, passive: true })
    root.addEventListener('touchmove', onInputActivity, { capture: true, passive: true })
    root.addEventListener('wheel', onInputActivity, { capture: true, passive: true })
    root.addEventListener('keydown', onKeyDown, { capture: true })
    root.addEventListener('touchend', endGrowDrag, { capture: true, passive: true })
    root.addEventListener('touchcancel', endGrowDrag, { capture: true, passive: true })
    return () => {
      root.removeEventListener('scroll', onScroll, { capture: true })
      root.removeEventListener('pointerdown', onGestureStart, { capture: true })
      root.removeEventListener('touchstart', onGestureStart, { capture: true })
      root.removeEventListener('touchmove', onInputActivity, { capture: true })
      root.removeEventListener('wheel', onInputActivity, { capture: true })
      root.removeEventListener('keydown', onKeyDown, { capture: true })
      root.removeEventListener('touchend', endGrowDrag, { capture: true })
      root.removeEventListener('touchcancel', endGrowDrag, { capture: true })
      endGrowDrag()
      if (frame !== null) {
        cancelAnimationFrame(frame)
      }
      root.style.removeProperty(COLLAPSE_PROGRESS_VAR)
      root.style.removeProperty(COLLAPSE_TEXT_VISIBILITY_VAR)
      root.style.removeProperty(COLLAPSE_TOUCH_ACTION_VAR)
    }
  }, [enabled])

  return rootRef
}
