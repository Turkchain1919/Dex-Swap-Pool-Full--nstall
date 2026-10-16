import { skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { UseQueryApiHelperHookArgs } from '@universe/api'
import {
  MarginApiClient,
  type MarginMarketsRequest,
  type MarginMarketsResponse,
} from 'uniswap/src/data/apiClients/tradingApi/MarginApiClient'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

// The key PREFIX — see MARGIN_POSITIONS_QUERY_KEY for why this is not retyped at the invalidation site.
export const MARGIN_MARKETS_QUERY_KEY = [ReactQueryCacheKey.TradingApi, 'margin/markets'] as const

export function useMarginMarketsQuery({
  params,
  ...rest
}: UseQueryApiHelperHookArgs<MarginMarketsRequest, MarginMarketsResponse>): UseQueryResult<MarginMarketsResponse> {
  return useQuery<MarginMarketsResponse>({
    queryKey: [...MARGIN_MARKETS_QUERY_KEY, params],
    queryFn: params
      ? async (): Promise<MarginMarketsResponse> => await MarginApiClient.fetchMarginMarkets(params)
      : skipToken,
    ...rest,
  })
}
