import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { normalizeTokenAddressForCache } from '@universe/chains'
import { usePricesContext } from '@universe/prices/src/context/PriceServiceContext'
import { priceKeys } from '@universe/prices/src/queries/priceKeys'
import { tokenPriceQueryOptions } from '@universe/prices/src/queries/tokenPriceQueryOptions'
import { MAX_DISPLAYABLE_PRICE_AGE_MS } from '@universe/prices/src/sources/rest/constants'
import type { PoolPriceRoute, TokenPriceData } from '@universe/prices/src/types'
import { useEffect } from 'react'

interface UsePriceOptions {
  chainId: number | undefined
  address: string | undefined
  live?: boolean
  /**
   * Realtime pool room serving this token's spot price (pool_price channel);
   * absent = token-keyed channels. Injected by the app — which pool represents
   * a token is app knowledge.
   */
  poolRoute?: PoolPriceRoute
}

/**
 * Hook to get the live price for a token along with its loading status.
 * Reads from React Query cache and auto-subscribes via websocket.
 * Falls back to REST polling when WS data goes stale (if restBatcher is provided).
 *
 * `price` is undefined while loading AND when the cached entry is older than
 * MAX_DISPLAYABLE_PRICE_AGE_MS — a withheld stale value reports isLoading:false,
 * so consumers should fall back to their own data source, not a spinner.
 *
 * `isStaleRefreshing` is true while the price is withheld as stale AND a fetch
 * is in flight to replace it (e.g. a rehydrated entry during its mount refetch):
 * the undefined price is provisional, not settled, so consumers whose
 * missing-price handling fails open should defer while it is true. Deliberately
 * false for a settled-missing entry (the cache holds null), so background polls
 * over a token with no known price don't flap consumers between "missing" and
 * "pending" on every tick.
 *
 * Requires a PriceServiceProvider in the tree.
 */
export function usePrice(options: UsePriceOptions): {
  price: number | undefined
  isLoading: boolean
  isStaleRefreshing: boolean
} {
  const { chainId, address, live = true, poolRoute } = options
  const { wsClient, restBatcher } = usePricesContext()
  const queryClient = useQueryClient()

  const enabled = chainId !== undefined && !!address

  // Data is populated externally via queryClient.setQueryData from WS messages.
  // When restBatcher is provided, an unconditional poll REST-fetches whenever
  // the cached entry goes stale — the safety net for a silently dead stream.
  const { data, isPending, isFetching } = useQuery(
    enabled
      ? tokenPriceQueryOptions({ chainId, address, restBatcher, queryClient })
      : queryOptions<TokenPriceData | null>({ queryKey: priceKeys.all, queryFn: skipToken, enabled: false }),
  )

  // Route fields (not the object identity) drive the effect so a stable route
  // doesn't churn subscriptions, while a route appearing upgrades in place.
  const routeProtocolVersion = poolRoute?.protocolVersion
  const routePoolId = poolRoute?.poolId
  useEffect(() => {
    if (!enabled || !live || !wsClient) {
      return undefined
    }
    const route =
      routeProtocolVersion && routePoolId ? { protocolVersion: routeProtocolVersion, poolId: routePoolId } : undefined
    return wsClient.subscribe({
      channel: 'token_price',
      params: { chainId, tokenAddress: normalizeTokenAddressForCache(address), poolRoute: route },
    })
  }, [enabled, live, chainId, address, wsClient, routeProtocolVersion, routePoolId])

  // Withhold prices past the display cap: a rehydrated hours-old value must
  // not render as current. Consumers fall back to their own data source until
  // the mount refetch or poll replaces the entry.
  const isDisplayable = !!data && Date.now() - data.timestamp <= MAX_DISPLAYABLE_PRICE_AGE_MS
  const price: number | undefined = enabled && isDisplayable ? data.price : undefined
  // Use isPending rather than React Query's isLoading (isPending && isFetching): in the
  // WS-only configuration (skipToken queryFn, no REST fetch) isFetching is never true, so
  // isLoading would stay false while waiting for the first WS message. isPending correctly
  // reports "no data yet" until the first WS/REST update settles the cache.
  // `!!data` (not `data !== undefined`) is load-bearing: it excludes the settled-null entry,
  // so only a withheld-stale value in mid-refresh reports as provisional (see JSDoc).
  const isStaleRefreshing = enabled && !!data && !isDisplayable && isFetching
  return { price, isLoading: enabled && isPending, isStaleRefreshing }
}
