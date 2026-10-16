import { useMemo } from 'react'
import { getPoolsPositionCounts } from 'uniswap/src/features/positions/hooks/usePoolsPositionsReport'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import type { V2PositionStatusFilter } from '~/features/Liquidity/constants'

interface UsePoolsPositionCountParams {
  v2StatusFilter: V2PositionStatusFilter[]
  visiblePositions: PositionInfo[]
  totalPoolsCount: number | undefined
  hasLoadedPositions: boolean
  hasNextPage: boolean
}

/**
 * Position count for the pools balance header, kept reconciled with the balance value it sits next
 * to. The backend GetWalletBalances pools count is open-only, matching the open-only balance, so it
 * is shown as-is and ignores table filters (range chips, search, protocol) that don't change the
 * balance. Selecting the Closed lifecycle adds the fully loaded closed rows on top: closed
 * positions hold no liquidity, so the sum stays consistent with the displayed balance. Undefined
 * means the count is unknown and renders as "-".
 */
export function usePoolsPositionCount({
  v2StatusFilter,
  visiblePositions,
  totalPoolsCount,
  hasLoadedPositions,
  hasNextPage,
}: UsePoolsPositionCountParams): number | undefined {
  // An empty lifecycle selection is sent as open + closed (v2StatusFilterToRequestStatuses).
  const includesClosed = v2StatusFilter.length === 0 || v2StatusFilter.includes('closed')

  return useMemo((): number | undefined => {
    if (totalPoolsCount === undefined) {
      return undefined
    }
    if (!includesClosed) {
      return totalPoolsCount
    }
    return hasLoadedPositions && !hasNextPage
      ? totalPoolsCount + getPoolsPositionCounts(visiblePositions).closed
      : undefined
  }, [includesClosed, totalPoolsCount, hasLoadedPositions, hasNextPage, visiblePositions])
}
