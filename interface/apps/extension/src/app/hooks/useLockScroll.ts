import { RefObject, useEffect } from 'react'

/**
 * Freezes every scroll container between `ref` and the viewport while `enabled` is true.
 *
 * Event-based locks (react-remove-scroll) can't stop a scrollbar thumb drag, since that
 * produces no wheel or touch event — only taking a container out of scrolling does. That
 * also takes away a classic scrollbar and widens the content box, so any container which
 * was reserving space for one keeps a gutter for as long as the lock lasts. Containers
 * with overlay scrollbars reserve nothing and so need no compensation.
 */
export function useLockScroll({ ref, enabled }: { ref: RefObject<unknown>; enabled: boolean }): void {
  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const restoreCallbacks = getScrollContainers(ref.current).map(lockScrollContainer)

    return () => restoreCallbacks.forEach((restore) => restore())
  }, [ref, enabled])
}

function getScrollContainers(node: unknown): HTMLElement[] {
  const containers: HTMLElement[] = [document.documentElement]
  let current = node instanceof HTMLElement ? node : null

  while (current && current !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(current)
    if (overflowY === 'auto' || overflowY === 'scroll') {
      containers.push(current)
    }
    current = current.parentElement
  }

  return containers
}

function lockScrollContainer(element: HTMLElement): () => void {
  // The viewport scrollbar sits outside documentElement's client box, so it can't be
  // measured the way a container measures its own.
  const scrollbarWidth =
    element === document.documentElement
      ? window.innerWidth - element.clientWidth
      : element.offsetWidth - element.clientWidth

  const { overflow, scrollbarGutter } = element.style

  element.style.overflow = 'hidden'
  if (scrollbarWidth > 0) {
    element.style.scrollbarGutter = 'stable'
  }

  return () => {
    element.style.overflow = overflow
    element.style.scrollbarGutter = scrollbarGutter
  }
}
