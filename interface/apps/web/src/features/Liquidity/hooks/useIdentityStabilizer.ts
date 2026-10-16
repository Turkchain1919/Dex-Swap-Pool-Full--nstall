import isEqual from 'lodash/isEqual'
import { useCallback, useRef } from 'react'

/**
 * Returns a stabilizer that preserves object identity across renders for a derived list.
 *
 * Each pass, an item whose value is deep-equal to the previous pass (matched by `getKey`) is
 * returned as the *previous* reference, and the whole array is returned as the *previous* array
 * reference when every item is reference-equal in order. This lets downstream `useMemo`/`memo`
 * boundaries short-circuit: an identical refetch (window focus, navigation, pending-tx
 * invalidation) that re-parses into fresh objects no longer forces the consumer to re-render.
 *
 * `getKey` and `areEqual` must both be referentially stable (module-level or memoized). Pass a
 * projection-based `areEqual` when items embed objects with lazily-cached fields (e.g. SDK
 * `Pool`/`Position` getters) that a deep `isEqual` would spuriously diff after first render.
 */
export function useIdentityStabilizer<T>(
  getKey: (item: T) => string,
  areEqual: (a: T, b: T) => boolean = isEqual,
): (items: T[]) => T[] {
  const itemsRef = useRef<Map<string, T>>(new Map())
  const listRef = useRef<T[]>([])

  return useCallback(
    (items: T[]): T[] => {
      const nextItems = new Map<string, T>()
      const stabilized = items.map((item) => {
        const key = getKey(item)
        // Only reuse a prior reference once per key, so two distinct items sharing a key don't collapse.
        const previous = nextItems.has(key) ? undefined : itemsRef.current.get(key)
        const stable = previous !== undefined && areEqual(previous, item) ? previous : item
        nextItems.set(key, stable)
        return stable
      })
      itemsRef.current = nextItems

      const prevList = listRef.current
      if (prevList.length === stabilized.length && prevList.every((item, index) => item === stabilized[index])) {
        return prevList
      }
      listRef.current = stabilized
      return stabilized
    },
    [getKey, areEqual],
  )
}
