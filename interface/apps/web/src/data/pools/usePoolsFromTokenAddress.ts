import { UniverseChainId, isSVMChain } from '@universe/chains'
import { useMemo } from 'react'
import type { MultichainTokenEntry } from 'uniswap/src/components/MultichainTokenDetails/useOrderedMultichainEntries'
import { PoolTableSortState } from '~/data/pools/poolStats'
import { useV2ListTokenPools } from '~/pages/Explore/hooks/useV2ListTokenPools'
import { useV2ListTokenPoolsMultichain } from '~/pages/Explore/hooks/useV2ListTokenPoolsMultichain'
import type { PoolStat } from '~/types/explore'

export function usePoolsFromTokenAddress({
  tokenAddress,
  sortState,
  chainId,
  isNative,
  multichain,
  multichainEntries = [],
}: {
  tokenAddress: string
  sortState: PoolTableSortState
  chainId: UniverseChainId
  isNative?: boolean
  multichain?: boolean
  /** This token's other known chain deployments, for the "All networks" aggregate view. */
  multichainEntries?: MultichainTokenEntry[]
}): {
  loading: boolean
  isError?: boolean
  pools: PoolStat[]
  loadMore: ({ onComplete }: { onComplete?: () => void }) => void
} {
  // getTokenListPoolsParams checksums assuming EVM, so SVM deployments get no request of their own.
  const evmMultichainEntries = useMemo(
    () => multichainEntries.filter((entry) => !isSVMChain(entry.chainId)),
    [multichainEntries],
  )

  const singleResult = useV2ListTokenPools({
    tokenAddress,
    chainId,
    isNative,
    sortState,
    // The single-chain path never sends SVM requests — keep the Solana skip.
    enabled: !multichain && !isSVMChain(chainId),
  })

  const multichainResult = useV2ListTokenPoolsMultichain({
    entries: evmMultichainEntries,
    sortState,
    enabled: !!multichain,
  })

  if (multichain) {
    return {
      loading: multichainResult.isLoading,
      isError: multichainResult.isError,
      pools: multichainResult.pools,
      loadMore: multichainResult.loadMore,
    }
  }

  return {
    loading: singleResult.isLoading,
    isError: singleResult.isError,
    pools: singleResult.pools ?? [],
    loadMore: singleResult.loadMore,
  }
}
