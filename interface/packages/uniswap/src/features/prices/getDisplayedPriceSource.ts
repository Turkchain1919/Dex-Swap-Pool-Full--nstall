import type { QueryClient } from '@tanstack/react-query'
import { getTokenPriceSource, type PriceSource } from '@universe/prices'

/**
 * Analytics tag for which pricing pipeline produced a displayed USD value.
 * Sent on user-funnel events so we can segment behavior by data source.
 */
export type PriceSourceTag = PriceSource

interface Args {
  chainId: number
  address: string
  /**
   * The React Query client whose cache holds the prices written by `LivePricesProvider`.
   * Pass the platform's shared client (e.g. `SharedQueryClient` from `@universe/api` on web).
   */
  queryClient: QueryClient
}

/**
 * Single source of truth for the `price_source` analytics property.
 *
 * Falls back to `aurora_rest_fallback` when the cache has no entry yet — this matches the
 * user-visible behavior (price will arrive via the next REST poll) better than `undefined`.
 */
export function getDisplayedPriceSource({ chainId, address, queryClient }: Args): PriceSourceTag {
  return getTokenPriceSource(queryClient, chainId, address) ?? 'aurora_rest_fallback'
}
