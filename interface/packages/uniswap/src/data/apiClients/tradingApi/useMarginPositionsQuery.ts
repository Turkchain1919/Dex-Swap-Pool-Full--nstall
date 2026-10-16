import { skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { UseQueryApiHelperHookArgs } from '@universe/api'
import {
  MarginApiClient,
  type MarginPositionsRequest,
  type MarginPositionsResponse,
} from 'uniswap/src/data/apiClients/tradingApi/MarginApiClient'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

// The key PREFIX, owned here rather than retyped at each invalidation site: six call sites across the
// margin feature invalidate this query, and a literal in each is a rename away from silently breaking
// every one of them.
export const MARGIN_POSITIONS_QUERY_KEY = [ReactQueryCacheKey.TradingApi, 'margin/positions'] as const

export function useMarginPositionsQuery({
  params,
  ...rest
}: UseQueryApiHelperHookArgs<
  MarginPositionsRequest,
  MarginPositionsResponse
>): UseQueryResult<MarginPositionsResponse> {
  return useQuery<MarginPositionsResponse>({
    queryKey: [...MARGIN_POSITIONS_QUERY_KEY, params],
    queryFn: params
      ? async (): Promise<MarginPositionsResponse> => await MarginApiClient.fetchMarginPositions(params)
      : skipToken,
    ...rest,
  })
}
