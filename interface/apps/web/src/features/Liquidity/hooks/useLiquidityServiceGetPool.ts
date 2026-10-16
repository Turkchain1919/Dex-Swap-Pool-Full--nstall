import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ChainId } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { GetPoolRequest, type GetPoolResponse } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/api_pb'
import type { UniverseChainId } from '@universe/chains'
import { liquidityQueries } from 'uniswap/src/data/apiClients/liquidityService/liquidityQueries'

/**
 * Shared `GetPool` request for `usePdpPool` and `usePoolActiveLiquidity` — both key on
 * `{chainId, addressOrId}` with version omitted (the backend resolves it), so they share one
 * request shape and cache entry.
 */
export function useLiquidityServiceGetPool({
  chainId,
  poolId,
  enabled,
}: {
  chainId: UniverseChainId
  poolId?: string
  enabled: boolean
}): UseQueryResult<GetPoolResponse, Error> {
  // ChainId enum values equal the numeric chain ids, so UniverseChainId maps directly.
  return useQuery(
    liquidityQueries.getPool({
      params: new GetPoolRequest({
        pool: { chainId: chainId as number as ChainId, addressOrId: poolId ?? '' },
      }),
      enabled: enabled && !!poolId,
    }),
  )
}
