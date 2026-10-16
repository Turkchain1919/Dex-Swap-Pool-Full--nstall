import { useQuery } from '@tanstack/react-query'
import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { ChainId } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { GetPoolTicksRequest } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/api_pb'
import { PoolProtocol } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { UniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { liquidityQueries } from 'uniswap/src/data/apiClients/liquidityService/liquidityQueries'
import { TickData } from '~/features/Liquidity/types/ticks'

/**
 * `useAllPoolTicks` data source backed by the liquidity-service `GetPoolTicks` endpoint. One RPC
 * returns the full V3/V4 tick distribution (ascending by tick). V2 has no ticks.
 */
export function useLiquidityServicePoolTicks({
  poolId,
  version,
  chainId,
  disabled = false,
}: {
  poolId?: string
  version: ProtocolVersion
  chainId: UniverseChainId
  disabled?: boolean
}): {
  isLoading: boolean
  error: unknown
  ticks?: TickData[]
} {
  // GetPoolTicks (V3/V4 only) requires the pool's PoolProtocol; the BE validates addressOrId against
  // it (V4 pool id is 64 hex, V3 address is 40 hex).
  const poolProtocol = version === ProtocolVersion.V4 ? PoolProtocol.V4 : PoolProtocol.V3

  const { data, isLoading, error } = useQuery(
    liquidityQueries.getPoolTicks({
      // ChainId enum values equal the numeric chain ids, so UniverseChainId maps directly.
      params: new GetPoolTicksRequest({
        pool: { chainId: chainId as number as ChainId, addressOrId: poolId ?? '', version: poolProtocol },
      }),
      enabled: !disabled && !!poolId && (version === ProtocolVersion.V3 || version === ProtocolVersion.V4),
    }),
  )

  return useMemo(
    () => ({
      ticks: data?.ticks.map(
        (t): TickData => ({
          tick: t.tickIdx,
          liquidityNet: t.liquidityNet,
        }),
      ),
      isLoading,
      error,
    }),
    [data?.ticks, isLoading, error],
  )
}
