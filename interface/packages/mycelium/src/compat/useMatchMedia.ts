import { useMemo, useSyncExternalStore } from 'react'

function getFalse(): boolean {
  return false
}

type MediaQueryStore = {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => boolean
}

// Inert store for callers whose media query is conditional (hook order must stay
// unconditional): no MediaQueryList listener is ever constructed.
const INERT_STORE: MediaQueryStore = {
  subscribe: () => () => {},
  getSnapshot: getFalse,
}

// Guarded so environments without a declared window or without matchMedia (server
// render, partial jsdom stubs) fall back to the non-matching state instead of throwing.
function createMediaQueryStore(query: string): MediaQueryStore {
  // Lazily constructed once per store, shared by subscribe and getSnapshot —
  // `matches` on a live MediaQueryList always reads current.
  let mediaQueryList: MediaQueryList | undefined
  const getMediaQueryList = (): MediaQueryList | undefined => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }
    mediaQueryList ??= window.matchMedia(query)
    return mediaQueryList
  }
  return {
    subscribe: (onChange: () => void): (() => void) => {
      const list = getMediaQueryList()
      if (list === undefined) {
        return () => {}
      }
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    getSnapshot: (): boolean => getMediaQueryList()?.matches ?? false,
  }
}

/**
 * Reactive `window.matchMedia` subscription: true while `query` matches, false
 * during SSR (the server snapshot) and in environments without `matchMedia`.
 * Pass `null` for an inert always-false store that never constructs a
 * MediaQueryList listener.
 */
export function useMatchMedia(query: string | null): boolean {
  const store = useMemo(() => (query === null ? INERT_STORE : createMediaQueryStore(query)), [query])
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getFalse)
}
