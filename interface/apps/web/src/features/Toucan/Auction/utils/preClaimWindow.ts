import { AuctionOutcome } from '~/features/Toucan/Auction/store/types'

/**
 * Whether a withdraw started now should take the **pre-claim** path: the auction has graduated but
 * its claim block has not arrived, so there are no tokens to claim yet and the only thing a bidder
 * can do is pull back unused budget.
 *
 * This is not cosmetic. The value rides to `WithdrawModal` as `isPreClaimWindow`, and
 * `useWithdrawBidAndClaimTokensFormSubmit` turns it into
 * `useSimpleExitApi = isPreClaimWindow && !!bidId` — i.e. it selects a **different onchain call**
 * (`exitBidPosition`). Getting it wrong sends a bidder down the wrong contract path.
 *
 * **Why `outcome === GRADUATED` and not `hasMetThreshold`.** Elsewhere in this feature the two are
 * deliberately different inputs, because the graduation threshold can latch *before* the end block
 * — that is what gates the mid-auction "refund unused budget" action. Here the distinction runs the
 * other way: `GRADUATED` also carries "the auction is over", and that part is load-bearing.
 * `isInPreClaimWindow` is merely `currentBlock < claimBlock`, which is **true for the whole live
 * auction** (the claim block is after the end block). So `hasMetThreshold && isInPreClaimWindow`
 * would be true throughout a live auction that has latched, switching every mid-auction refund onto
 * the pre-claim contract path. `GRADUATED` is what keeps this to the real post-end window.
 */
export function shouldUsePreClaimWindow({
  outcome,
  isInPreClaimWindow,
}: {
  outcome: AuctionOutcome
  isInPreClaimWindow: boolean
}): boolean {
  return outcome === AuctionOutcome.GRADUATED && isInPreClaimWindow
}
