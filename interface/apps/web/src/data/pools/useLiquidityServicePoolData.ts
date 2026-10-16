import { useQuery } from '@tanstack/react-query'
import type { ChainId } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { GetPoolRequest } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/api_pb'
import { UniverseChainId, isSVMChain } from '@universe/chains'
import { useMemo } from 'react'
import { liquidityQueries } from 'uniswap/src/data/apiClients/liquidityService/liquidityQueries'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { parseLiquidityServicePool } from '~/data/pools/parseLiquidityServicePool'
import type { PoolData } from '~/data/pools/poolData'

/**
 * Pool detail backed by the liquidity-service `GetPool` endpoint. One RPC returns unified V2/V3/V4
 * pool details: the backend resolves the protocol version from chain + address, so the request
 * omits `version` and takes only the pool reference.
 *
 * Called directly by the Pool Details Page and other pool-detail surfaces, including the
 * add-liquidity flow.
 */
export function useLiquidityServicePoolData({
  poolIdOrAddress,
  chainId,
  disabled = false,
}: {
  poolIdOrAddress: string
  chainId?: UniverseChainId
  disabled?: boolean
}): {
  loading: boolean
  error: boolean
  data?: PoolData
} {
  const { defaultChainId } = useEnabledChains()
  const resolvedChainId = chainId ?? defaultChainId

  const { data, isLoading, error } = useQuery(
    liquidityQueries.getPool({
      // ChainId enum values equal the numeric chain ids, so UniverseChainId maps directly. Version
      // is omitted (backend resolves the protocol version from chain + address).
      params: new GetPoolRequest({
        pool: { chainId: resolvedChainId as number as ChainId, addressOrId: poolIdOrAddress },
      }),
      // The liquidity `ChainId` enum is EVM-only, so an SVM chain id would cast to a meaningless
      // enum value. Refused here rather than at each call site — it's a property of the endpoint.
      enabled: !disabled && !isSVMChain(resolvedChainId),
    }),
  )

  return useMemo(
    () => ({
      data: data?.pool ? parseLiquidityServicePool(data.pool, resolvedChainId) : undefined,
      loading: isLoading,
      error: Boolean(error),
    }),
    [data?.pool, isLoading, error, resolvedChainId],
  )
}
