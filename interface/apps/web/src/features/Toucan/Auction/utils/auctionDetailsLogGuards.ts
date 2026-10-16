import { createLogOnceGuard } from '~/features/Toucan/Auction/utils/createLogOnceGuard'

// Kept separate from auctionCheckpointLogGuards deliberately: a GetAuction failure is a different
// failure with a different cause and a different fix from a checkpoint stall, so recording one must
// not suppress the other for the same auction. It is also the *root* failure — without auction
// details there are no start/end blocks, so the page cannot even tell whether the auction ended.
const detailsErrorGuard = createLogOnceGuard()

// Separate key space again: a response that arrived without the token's total supply is a *partial*
// success, not a failed request, and the two are fixed in different places (GetAuction availability
// vs. the upstream RPC the supply is read from). Sharing a guard would let one hide the other.
const missingTokenTotalSupplyGuard = createLogOnceGuard()

/** Reports a GetAuction request that settled as a failure, at most once per auction this session. */
export const logAuctionDetailsErrorOnce = detailsErrorGuard.logOnce

/**
 * Reports a GetAuction response that carried no usable token total supply, at most once per auction
 * this session. Every FDV surface degrades to a placeholder without it, so this is the only record
 * of whether the gap is transient RPC flakiness or structural for a given token.
 */
export const logMissingTokenTotalSupplyOnce = missingTokenTotalSupplyGuard.logOnce

/** Test-only: clears the once-per-session log dedupe guards. */
export function resetAuctionDetailsLogGuards(): void {
  detailsErrorGuard.reset()
  missingTokenTotalSupplyGuard.reset()
}
