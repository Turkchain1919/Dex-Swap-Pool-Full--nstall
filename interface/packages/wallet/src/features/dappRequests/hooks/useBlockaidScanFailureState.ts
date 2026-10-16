import type { BlockaidScanType } from 'uniswap/src/features/dappRequests/types'
import { useLogBlockaidScanFailure } from 'wallet/src/features/dappRequests/hooks/useLogBlockaidScanFailure'
import { useStickyBlockaidScanFailureState } from 'wallet/src/features/dappRequests/hooks/useStickyBlockaidScanFailureState'
import type { BlockaidScanFailureState } from 'wallet/src/features/dappRequests/utils/blockaidScanQuery'

/** Keeps scan-failure gating and telemetry on the same request-keyed policy. */
export function useBlockaidScanFailureState({
  requestKey,
  failureState,
  scanType,
  dappUrl,
  chain,
  requestMethod,
  error,
}: {
  requestKey: string
  failureState: BlockaidScanFailureState
  scanType: BlockaidScanType
  dappUrl?: string
  chain?: string
  requestMethod?: string
  error: Error | null
}): BlockaidScanFailureState {
  useLogBlockaidScanFailure({
    requestKey,
    scanType,
    dappUrl,
    chain,
    requestMethod,
    error,
  })

  return useStickyBlockaidScanFailureState({ requestKey, failureState })
}
