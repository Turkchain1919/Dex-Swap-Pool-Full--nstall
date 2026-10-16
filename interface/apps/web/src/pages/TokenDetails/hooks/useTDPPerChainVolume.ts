import type { PlainMessage } from '@bufbuild/protobuf'
import { useQuery } from '@tanstack/react-query'
import type { GetTokenMarketsResponse } from '@uniswap/client-data-api/dist/data/v2/api_pb'
import { HistoryDuration } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { useMemo } from 'react'
import { getGetTokenMarketsQueryOptions } from 'uniswap/src/data/apiClients/dataApiService/tokens/queries'
import { isUniverseChainId } from 'uniswap/src/features/chains/utils'
import { useTDPStore } from '~/pages/TokenDetails/context/useTDPStore'

/** 24h volume per chainId. Exported for tests. */
export function selectVolumeByChainId(data: PlainMessage<GetTokenMarketsResponse> | undefined): Record<number, number> {
  const volumes: Record<number, number> = {}
  for (const market of data?.markets ?? []) {
    if (market.stats?.volumeUsd !== undefined) {
      volumes[market.chainId] = market.stats.volumeUsd
    }
  }
  return volumes
}

export function useTDPPerChainVolume({ enabled }: { enabled: boolean }): Record<number, number> | undefined {
  const { multichainToken } = useTDPStore((s) => ({
    multichainToken: s.multichainToken,
  }))

  const deployments = useMemo(
    () =>
      Object.entries(multichainToken?.addresses ?? {})
        .map(([chainIdKey, address]) => ({ chainId: Number(chainIdKey), address }))
        .filter((deployment) => isUniverseChainId(deployment.chainId)),
    [multichainToken?.addresses],
  )

  const { data } = useQuery(
    getGetTokenMarketsQueryOptions({
      params: deployments.length > 0 ? { tokens: deployments, duration: HistoryDuration.DAY } : undefined,
      enabled: enabled && deployments.length > 1,
      select: selectVolumeByChainId,
    }),
  )

  return data
}
