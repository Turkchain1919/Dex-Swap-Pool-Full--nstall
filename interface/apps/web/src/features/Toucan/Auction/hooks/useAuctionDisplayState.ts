import { FeatureFlags, useFeatureFlag } from '@universe/gating'
import { useAuctionDisplayDataSources } from '~/features/Toucan/Auction/hooks/useAuctionDisplayDataSources'
import { useAuctionStore } from '~/features/Toucan/Auction/store/useAuctionStore'
import {
  resolveAuctionDisplayState,
  type AuctionDisplayState,
} from '~/features/Toucan/Auction/utils/resolveAuctionDisplayState'

/**
 * Shared phase / pool-availability state for the auction in the store. `undefined` while the
 * TokenProvenance flag is off, which also keeps the pool lookup from running.
 */
export function useAuctionDisplayState(): AuctionDisplayState | undefined {
  const isEnabled = useFeatureFlag(FeatureFlags.TokenProvenance)
  const { auctionDetails, currentBlockNumber } = useAuctionStore((state) => ({
    auctionDetails: state.auctionDetails,
    currentBlockNumber: state.currentBlockNumber,
  }))
  const { currentBlock, currencyRaised, pools } = useAuctionDisplayDataSources({
    chainId: auctionDetails?.chainId,
    tokenAddress: auctionDetails?.tokenAddress,
    auctionAddress: auctionDetails?.address,
    startBlock: auctionDetails?.startBlock,
    endBlock: auctionDetails?.endBlock,
    enabled: isEnabled && auctionDetails !== null,
    currentBlock:
      currentBlockNumber === undefined
        ? { status: 'loading' }
        : { status: 'success', blockNumber: BigInt(currentBlockNumber) },
  })

  if (!isEnabled) {
    return undefined
  }

  return resolveAuctionDisplayState({ auction: auctionDetails, currentBlock, currencyRaised, pools })
}
