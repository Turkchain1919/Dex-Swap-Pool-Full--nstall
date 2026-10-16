import { useEffect } from 'react'

let scrollLockCount = 0
let previousRootStyle: { scrollbarGutter: string; overflow: string } | null = null

/**
 * The single shared refcounted body-scroll lock for every web overlay — both
 * sheet families lock through this one pool, so nested overlays cannot unlock
 * the page behind one another. The first lock saves and the last unlock
 * restores `documentElement`'s `overflow` and `scrollbar-gutter`.
 */
export function useDisableBodyScroll(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return undefined
    }
    const rootEl = document.documentElement
    if (++scrollLockCount === 1) {
      previousRootStyle = {
        scrollbarGutter: rootEl.style.scrollbarGutter,
        overflow: rootEl.style.overflow,
      }
      rootEl.style.scrollbarGutter = 'stable'
      rootEl.style.overflow = 'hidden'
    }
    return () => {
      if (--scrollLockCount === 0 && previousRootStyle) {
        Object.assign(rootEl.style, previousRootStyle)
        previousRootStyle = null
      }
    }
  }, [enabled])
}
