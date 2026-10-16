import { createLogOnceGuard } from '~/features/Toucan/Auction/utils/createLogOnceGuard'

// One guard per signal, not one shared guard: a failed fetch and a settled-but-unreadable payload
// are distinct stalls with distinct causes, so recording one must not suppress the other for the
// same auction. createLogOnceGuard carries the ordering rule both callers depend on.
const checkpointErrorGuard = createLogOnceGuard()
const undecidableCheckpointGuard = createLogOnceGuard()

/** Reports a checkpoint request that settled as a failure, at most once per auction this session. */
export const logCheckpointErrorOnce = checkpointErrorGuard.logOnce

/** Reports a settled-but-undecidable checkpoint, at most once per auction this session. */
export const logUndecidableCheckpointOnce = undecidableCheckpointGuard.logOnce

/** Test-only: clears the once-per-session log dedupe guards. */
export function resetAuctionCheckpointLogGuards(): void {
  checkpointErrorGuard.reset()
  undecidableCheckpointGuard.reset()
}
