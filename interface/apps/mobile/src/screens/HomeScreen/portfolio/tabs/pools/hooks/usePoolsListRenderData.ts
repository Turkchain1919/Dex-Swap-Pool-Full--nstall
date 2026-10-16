import { Platform } from '@universe/chains'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import {
  POSITION_STATUS_FILTER_TO_STATUSES,
  PositionStatusFilterValue,
} from 'uniswap/src/features/positions/components/PositionStatusFilter'
import { SORT_BY_USD_VALUE_DESC, useWalletPositions } from 'uniswap/src/features/positions/hooks/useWalletPositions'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import { useEvent } from 'utilities/src/react/hooks'
import { usePendingLiquidityTransactionsChangeListener } from 'wallet/src/features/transactions/hooks/usePendingLiquidityTransactionsChangeListener'

export interface PoolsListRenderData {
  positions: PositionInfo[]
  hiddenPositions: PositionInfo[]
  hasData: boolean
  // Widened from ConnectError: useWalletPositions forwards either data source's query error.
  error: Error | null
  isFetching: boolean
  isFetchingNextPage: boolean
  isFetchingFirstPage: boolean
  /** First page is still loading and nothing has rendered yet — the surface should show the skeleton. */
  isLoadingFirstPage: boolean
  /** Errored with nothing already shown — the surface should swap to the retry CTA. */
  hasErrorWithoutData: boolean
  hasNextPage: boolean
  pagesLoaded: number
  refetch: () => void
  onListEndReached: () => void
}

export type PoolsTabRenderData = Omit<PoolsListRenderData, 'onListEndReached'>

/**
 * Provides the Home Pools tab's positions + pagination for the outer feed FlatList. Fetches all
 * statuses + hidden at the default page size so it shares the wallet positions cache key with
 * `usePoolsTabVisibility` — opening the tab triggers no extra request.
 */
export function usePoolsListRenderData({ owner, skip }: { owner: string; skip: boolean }): PoolsListRenderData {
  const { chains } = useEnabledChains({ platform: Platform.EVM })
  const {
    positions,
    hiddenPositions,
    hasData,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    pagesLoaded,
  } = useWalletPositions({
    account: owner,
    chainIds: chains,
    statuses: POSITION_STATUS_FILTER_TO_STATUSES[PositionStatusFilterValue.All],
    includeHidden: true,
    autoFetchAllPages: false,
    ...SORT_BY_USD_VALUE_DESC,
    disabled: skip,
    // No pollInterval — the Home heartbeat coordinator refreshes positions on its 60s full tick
    // while the Pools tab is active.
  })

  usePendingLiquidityTransactionsChangeListener(refetch)

  const onListEndReached = useEvent((): void => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  })

  const isFetchingFirstPage = isFetching && !isFetchingNextPage
  const isLoadingFirstPage = isFetchingFirstPage && !hasData
  const hasErrorWithoutData = !!error && !hasData && !isFetchingFirstPage

  return {
    positions,
    hiddenPositions,
    hasData,
    error,
    isFetching,
    isFetchingNextPage,
    isFetchingFirstPage,
    isLoadingFirstPage,
    hasErrorWithoutData,
    hasNextPage,
    pagesLoaded,
    refetch,
    onListEndReached,
  }
}
