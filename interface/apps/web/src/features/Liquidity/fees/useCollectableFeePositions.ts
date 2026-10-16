import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { UniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { useWalletPositions } from 'uniswap/src/features/positions/hooks/useWalletPositions'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import { usePendingLPTransactionsChangeListener } from '~/state/transactions/hooks'

interface UseCollectableFeePositionsResult {
  /** V3/V4 positions with a positive uncollected-fee balance, largest first (poolId tiebreak). */
  positions: PositionInfo[]
  /** True until every page has arrived — a partial list can't say which positions have fees. */
  isFetching: boolean
  hasError: boolean
}

/**
 * The wallet's collectable-fee positions, shared by the portfolio fees panel and the Your fees
 * modal so eligibility (V2 pairs never collect: pair fees compound into reserves) and ordering
 * can't drift between the two surfaces. Refetches when a pending LP transaction (e.g. a collect)
 * lands.
 */
export function useCollectableFeePositions({
  walletAddress,
  chainIds,
  enabled = true,
}: {
  walletAddress: string | undefined
  chainIds?: UniverseChainId[]
  enabled?: boolean
}): UseCollectableFeePositionsResult {
  const isEnabled = enabled && Boolean(walletAddress)
  // `positions` is the VISIBLE partition only — spam-flagged and user-hidden positions never
  // reach the fee surfaces, matching the pre-V2 fees panel (and the chip's balance total, whose
  // request carries the same visibility modifier). Open-only (the default statuses) is deliberate:
  // closing a position collects its fees in the same transaction, so CLOSED rows can't carry any —
  // and matching the table's default request lets the modal reuse its cached pages.
  const {
    positions: visiblePositions,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    refetch,
  } = useWalletPositions({
    account: isEnabled ? (walletAddress ?? '') : '',
    chainIds,
    autoFetchAllPages: true,
  })

  usePendingLPTransactionsChangeListener(refetch)

  const positions = useMemo(() => {
    return visiblePositions
      .filter((position) => position.version !== ProtocolVersion.V2 && (position.uncollectedFeesUsd ?? 0) > 0)
      .sort((a, b) => {
        const diff = (b.uncollectedFeesUsd ?? 0) - (a.uncollectedFeesUsd ?? 0)
        return diff !== 0 ? diff : a.poolId.localeCompare(b.poolId)
      })
  }, [visiblePositions])

  return {
    positions,
    isFetching: isEnabled && !error && (isLoading || hasNextPage || isFetchingNextPage),
    hasError: Boolean(error),
  }
}
