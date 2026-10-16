import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { UniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { PoolTableSortState } from '~/data/pools/poolStats'
import { OrderDirection } from '~/data/util'
import { poolSortFieldToOrderBy } from '~/features/Liquidity/utils/convertPoolToPoolStat'
import { getTokenListPoolsParams } from '~/features/Liquidity/utils/getTokenListPoolsParams'
import { useInfiniteLoadMore } from '~/hooks/useInfiniteLoadMore'
import { type ListPoolsAsPoolStatsResult, useListPoolsAsPoolStats } from '~/pages/Explore/hooks/useListPoolsAsPoolStats'

// Matches the legacy per-protocol GraphQL queries' page size in usePoolsFromTokenAddress.
const TOKEN_LIST_POOLS_PAGE_SIZE = 20

type V2ListTokenPoolsResult = Omit<ListPoolsAsPoolStatsResult, 'error' | 'fetchNextPage'> & {
  loadMore: ({ onComplete }: { onComplete?: () => void }) => void
}

/**
 * data.v2 ListPools counterpart of the legacy per-protocol GraphQL queries in
 * `usePoolsFromTokenAddress`. Single-chain only — multichain TDP views use
 * `useV2ListTokenPoolsMultichain`.
 */
export function useV2ListTokenPools({
  tokenAddress,
  chainId,
  isNative,
  sortState,
  enabled = true,
}: {
  tokenAddress: string | undefined
  chainId: UniverseChainId | undefined
  isNative?: boolean
  sortState: PoolTableSortState
  enabled?: boolean
}): V2ListTokenPoolsResult {
  const orderBy = poolSortFieldToOrderBy[sortState.sortBy]
  const ascending = sortState.sortDirection === OrderDirection.Asc

  const params = useMemo(
    () =>
      getTokenListPoolsParams({
        chainId,
        tokenAddress,
        isNative,
        protocolVersions: [ProtocolVersion.V2, ProtocolVersion.V3, ProtocolVersion.V4],
        sort: { orderBy, ascending },
      }),
    [chainId, tokenAddress, isNative, orderBy, ascending],
  )

  const {
    pools,
    rawPoolCount,
    isLoading,
    isSuccess,
    isFetchedAfterMount,
    refetch,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListPoolsAsPoolStats({
    params,
    pageSize: TOKEN_LIST_POOLS_PAGE_SIZE,
    enabled: enabled && !!params,
  })

  const loadMore = useInfiniteLoadMore({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  })

  return {
    pools,
    rawPoolCount,
    isLoading,
    isSuccess,
    isFetchedAfterMount,
    refetch,
    isError,
    loadMore,
    hasNextPage,
    isFetchingNextPage,
  }
}
