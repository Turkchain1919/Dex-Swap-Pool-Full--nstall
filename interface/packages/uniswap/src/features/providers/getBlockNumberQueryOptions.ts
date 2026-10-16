import { queryOptions, skipToken } from '@tanstack/react-query'
import type { EVMUniverseChainId } from '@universe/chains'
import { viemClients } from 'uniswap/src/features/providers/viemClients'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

export function getBlockNumberQueryOptions({
  chainId,
  enabled = true,
}: {
  chainId: EVMUniverseChainId | undefined
  enabled?: boolean
}): ReturnType<typeof queryOptions<bigint>> {
  const queryEnabled = enabled && chainId !== undefined
  return queryOptions<bigint>({
    queryKey: [ReactQueryCacheKey.BlockNumber, { chainId }],
    queryFn: queryEnabled ? () => viemClients.getViemClient(chainId).getBlockNumber({ cacheTime: 0 }) : skipToken,
    enabled: queryEnabled,
  })
}
