/**
 * `$sm`/`$md` breakpoint hooks for the Input compat, web leg: the exact
 * max-width media queries Tamagui compiled those keys to. Guarded for
 * non-browser environments (SSR, node-env test DOMs have no `matchMedia`) —
 * they read as "not matching", which is also the server snapshot. The
 * theme-hooks `useMedia` compat is NOT reused here on purpose: its web leg
 * requires a live `matchMedia` and would throw in those environments, which
 * the legacy Input tolerated.
 */
import { useSyncExternalStore } from 'react'
import { BREAKPOINT_PX } from '../theme-hooks-compat/tokens'

function canMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function getServerSnapshot(): boolean {
  return false
}

function createMaxWidthHook(maxWidth: number): () => boolean {
  const query = `(max-width: ${maxWidth}px)`
  const subscribe = (onChange: () => void): (() => void) => {
    if (!canMatchMedia()) {
      return () => {}
    }
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }
  const getSnapshot = (): boolean => canMatchMedia() && window.matchMedia(query).matches
  const useMaxWidthBreakpoint = (): boolean => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return useMaxWidthBreakpoint
}

export const useIsSmBreakpoint = createMaxWidthHook(BREAKPOINT_PX.sm)
export const useIsMdBreakpoint = createMaxWidthHook(BREAKPOINT_PX.md)
