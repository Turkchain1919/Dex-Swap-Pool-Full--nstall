import { useEffect, useRef } from 'react'
import type { BlockaidScanType } from 'uniswap/src/features/dappRequests/types'
import { WalletEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import {
  BlockaidScanUnusableError,
  isPermanentScanError,
} from 'wallet/src/features/dappRequests/utils/blockaidScanQuery'

/**
 * Logs one analytics event when a Blockaid scan fails, so failures can be grouped by dApp in
 * Amplitude to surface recurring offenders worth escalating to Blockaid (and to track how often
 * the "safety check unavailable" caution actually shows).
 *
 * Fires once per scan request key, even if React Query implicitly refetches after focus or
 * reconnect and produces a new Error. If a later refetch upgrades a transient failure to a
 * permanent one, it emits the stronger classification so telemetry matches the warning shown to
 * the user. A paused/offline or never-run scan carries no `error`, so it is intentionally not
 * reported (it is not a Blockaid-side failure).
 */
export function useLogBlockaidScanFailure({
  requestKey,
  scanType,
  dappUrl,
  chain,
  requestMethod,
  error,
}: {
  requestKey: string
  scanType: BlockaidScanType
  dappUrl?: string
  chain?: string
  requestMethod?: string
  error: Error | null
}): void {
  const loggedFailurePermanenceByRequestKeyRef = useRef<Map<string, boolean>>(new Map())

  useEffect(() => {
    if (!error) {
      return
    }

    const scanError = error instanceof BlockaidScanUnusableError ? error : undefined
    const isPermanent = isPermanentScanError(error)
    const loggedPermanence = loggedFailurePermanenceByRequestKeyRef.current.get(requestKey)

    // Log once per request key, unless a later failure upgrades the UI from transient to permanent.
    if (loggedPermanence === true || loggedPermanence === isPermanent) {
      return
    }
    loggedFailurePermanenceByRequestKeyRef.current.set(requestKey, isPermanent)

    sendAnalyticsEvent(WalletEventName.DappRequestScanFailed, {
      dapp_url: dappUrl,
      chain,
      scan_type: scanType,
      failure_kind: scanError?.failureKind ?? 'unknown',
      is_permanent: isPermanent,
      reason: scanError?.reason ?? 'unknown',
      request_method: requestMethod,
    })
  }, [requestKey, error, dappUrl, chain, scanType, requestMethod])
}
