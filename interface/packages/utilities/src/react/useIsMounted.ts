import { useEffect, useState } from 'react'

/**
 * Whether this component has rendered at least once already.
 *
 * Returns `false` on the first render and `true` from the second render onward, on
 * every platform, both under pure client-side rendering and while hydrating. Use it
 * to gate anything that must not run or paint until the component is on screen:
 * `document`/`window` reads, portals, and markup that would otherwise disagree
 * between the server render and the first client render.
 */
export function useIsMounted(): boolean {
  // Must stay `useState` + a mount-only effect, NOT `useSyncExternalStore`: the latter
  // reads its client snapshot (`true`) on the very first render under pure client-side
  // rendering, dropping the initial `false` render that every caller here relies on.
  // The repo-wide `useSyncExternalStore` preference is about external store
  // subscriptions, which this is not.
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}
