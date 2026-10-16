import { useAuctionDisplayState } from '~/features/Toucan/Auction/hooks/useAuctionDisplayState'
import { useAuctionStore } from '~/features/Toucan/Auction/store/useAuctionStore'
import { shouldShowNowTradingCard } from '~/features/Toucan/Auction/utils/auctionDisplayVisibility'
import { isTradingRestrictedUntilTge } from '~/features/Toucan/Config/config'

/** Shared by the card and the panel-state mirror so the two cannot disagree. */
export function useShouldShowNowTradingCard(): boolean {
  const auctionDetails = useAuctionStore((state) => state.auctionDetails)
  const displayState = useAuctionDisplayState()
  return (
    auctionDetails !== null &&
    shouldShowNowTradingCard({
      state: displayState,
      tradingRestrictedUntilTge: isTradingRestrictedUntilTge({
        chainId: auctionDetails.chainId,
        tokenAddress: auctionDetails.tokenAddress,
      }),
    })
  )
}
