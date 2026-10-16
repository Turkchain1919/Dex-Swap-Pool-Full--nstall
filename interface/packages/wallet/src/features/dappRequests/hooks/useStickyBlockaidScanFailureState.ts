import { useRef } from 'react'
import type { BlockaidScanFailureState } from 'wallet/src/features/dappRequests/utils/blockaidScanQuery'

/**
 * Keeps an attacker-inducible permanent failure acknowledgement-gated for the lifetime of a request.
 * React Query clears or replaces `error` when it refetches, so deriving permanence from only the
 * current error would let a paused or transient refetch downgrade a previously permanent failure.
 * The ref is updated during render intentionally: moving this write to an effect would allow one
 * transient, ungated frame to paint before the permanent state is restored.
 */
export function useStickyBlockaidScanFailureState({
  requestKey,
  failureState,
}: {
  requestKey: string
  failureState: BlockaidScanFailureState
}): BlockaidScanFailureState {
  const permanentFailureRequestKeysRef = useRef<Set<string>>(new Set())

  if (failureState.isScanFailurePermanent) {
    permanentFailureRequestKeysRef.current.add(requestKey)
  }

  return {
    ...failureState,
    isScanFailurePermanent:
      failureState.isScanFailurePermanent ||
      (failureState.hasScanFailed && permanentFailureRequestKeysRef.current.has(requestKey)),
  }
}
