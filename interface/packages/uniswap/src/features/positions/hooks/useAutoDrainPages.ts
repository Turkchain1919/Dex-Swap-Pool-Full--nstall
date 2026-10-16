import { useEffect } from 'react'

/**
 * Auto-drain pages: keep firing `fetchNextPage` until `hasNextPage` flips false.
 * Guarded against retry loops: if the last fetch errored, stop until the consumer
 * refetches; if any fetch is in flight, wait for it to settle before queueing another.
 */
export function useAutoDrainPages({
  enabled,
  hasNextPage,
  isFetchingNextPage,
  isFetching,
  error,
  fetchNextPage,
}: {
  enabled: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetching: boolean
  error: Error | null
  fetchNextPage: () => Promise<unknown>
}): void {
  useEffect(() => {
    if (!enabled || error) {
      return
    }
    if (hasNextPage && !isFetchingNextPage && !isFetching) {
      fetchNextPage().catch(() => {
        // Swallow - React Query surfaces errors via the query state; the error guard
        // above prevents this effect from re-firing into a failing endpoint.
      })
    }
  }, [enabled, hasNextPage, isFetchingNextPage, isFetching, error, fetchNextPage])
}
