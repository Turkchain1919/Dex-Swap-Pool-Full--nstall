/**
 * Collapses a burst of scroll events into the newest one per animation frame.
 *
 * React Native delivers every native scroll event to JS as its own task, and Legend List
 * recomputes and commits rows for each one. When rows are expensive and the JS thread falls
 * behind (a fling on a slow device), the queue replays every position the viewport passed and the
 * list renders rows the user already scrolled past — measured as a multi-second blank body on the
 * token selector. Legend List has no knob for this, so the scroll container feeds it only the most
 * recent event once the current frame's events have all landed.
 *
 * Only plain function handlers are coalesced; an `Animated.event` (Legend List's sticky-header
 * path) must reach the ScrollView untouched so the native driver can attach to it.
 */
export function coalesceScrollEvents<E>(
  deliver: (event: E) => void,
  {
    schedule = requestAnimationFrame,
    cancel = cancelAnimationFrame,
  }: { schedule?: (callback: () => void) => number; cancel?: (handle: number) => void } = {},
): { onScroll: (event: E) => void; dispose: () => void } {
  let latest: E | undefined
  let handle: number | undefined

  const flush = (): void => {
    handle = undefined
    const pending = latest
    latest = undefined
    if (pending !== undefined) {
      deliver(pending)
    }
  }

  return {
    onScroll: (event: E): void => {
      latest = event
      handle ??= schedule(flush)
    },
    dispose: (): void => {
      if (handle !== undefined) {
        cancel(handle)
        handle = undefined
      }
      latest = undefined
    },
  }
}
