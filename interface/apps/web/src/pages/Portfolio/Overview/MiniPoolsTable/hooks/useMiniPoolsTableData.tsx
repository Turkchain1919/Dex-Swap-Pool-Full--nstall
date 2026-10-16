import { UniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { SORT_BY_USD_VALUE_DESC, useWalletPositions } from 'uniswap/src/features/positions/hooks/useWalletPositions'
import { PositionInfo } from 'uniswap/src/features/positions/types'
import { usePendingLPTransactionsChangeListener } from '~/state/transactions/hooks'

interface UseMiniPoolsTableDataParams {
  account: string
  maxPools?: number
  chainId?: UniverseChainId
}

export function useMiniPoolsTableData({ account, maxPools = 5, chainId }: UseMiniPoolsTableDataParams): {
  positions: PositionInfo[]
  showLoading: boolean
  hasNoData: boolean
} {
  // Preview-only surface: only the first page is needed for the top-N slice.
  const {
    positions: visiblePositions,
    isLoading,
    refetch,
  } = useWalletPositions({
    account,
    chainIds: chainId ? [chainId] : undefined,
    autoFetchAllPages: false,
    ...SORT_BY_USD_VALUE_DESC,
  })

  usePendingLPTransactionsChangeListener(refetch)

  const positions = useMemo(() => visiblePositions.slice(0, maxPools), [visiblePositions, maxPools])

  const showLoading = isLoading && positions.length === 0
  const hasNoData = positions.length === 0 && !isLoading

  return { positions, showLoading, hasNoData }
}
