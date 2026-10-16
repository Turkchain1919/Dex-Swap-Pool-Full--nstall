import { FetchError, type BlockaidScanTransactionResponse } from '@universe/api'
import type {
  BlockaidScanFailureKind,
  BlockaidScanFailureReason,
  BlockaidScanType,
} from 'uniswap/src/features/dappRequests/types'
import { logger } from 'utilities/src/logger/logger'
import { ONE_MINUTE_MS } from 'utilities/src/time/time'
import { TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import { getRiskLevelFromValidation } from 'wallet/src/features/dappRequests/utils/blockaidUtils'

const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS

/** Shared options so the two scan surfaces cannot drift apart on scan policy. */
export const BLOCKAID_SCAN_QUERY_OPTIONS = {
  staleTime: FIVE_MINUTES_MS,
  // Don't retry on failures - confirmation stays blocked so the user can cancel and retry.
  retry: false,
} as const

export class BlockaidScanUnusableError extends Error {
  readonly isPermanent: boolean
  readonly failureKind: BlockaidScanFailureKind
  /** The bounded specific cause (e.g. `request_too_large`, `transport_error`, `validation_error`) — the grouping key for failure analytics. */
  readonly reason: BlockaidScanFailureReason

  constructor({
    reason,
    isPermanent,
    failureKind,
    cause,
  }: {
    reason: BlockaidScanFailureReason
    isPermanent: boolean
    failureKind: BlockaidScanFailureKind
    cause?: unknown
  }) {
    super(`Blockaid scan did not return a usable ${failureKind}: ${reason}`, { cause })
    this.name = 'BlockaidScanUnusableError'
    this.isPermanent = isPermanent
    this.failureKind = failureKind
    this.reason = reason
  }
}

/** Mirrors the fail-closed permanence used by confirmation gating and failure telemetry. */
export function isPermanentScanError(error: Error): boolean {
  return !(error instanceof BlockaidScanUnusableError) || error.isPermanent
}

function throwRejectedScan({ error, scanType }: { error: unknown; scanType: BlockaidScanType }): never {
  const httpStatus = error instanceof FetchError ? error.response.status : undefined
  // The only aborter on the scan fetch is its own 5s timeout — a user dismissing the request cancels
  // the React Query observer without aborting this fetch — so an AbortError here is a genuine Blockaid
  // timeout, labeled separately from other transport failures so the timeout rate stays readable.
  const isTimeout = error instanceof Error && error.name === 'AbortError'

  // Fail closed by default: the ONLY transient (ungated) rejection is one with no HTTP status — a
  // connection-level blip (DNS/TLS/offline) that isn't request-shaped and a dapp can't aim. Every HTTP
  // response is permanent (acknowledgement-gated): a timeout (a payload crafted to exceed the 5s scan
  // budget), a 413, a 429 (volume-influenceable), a 5xx (indistinguishable from a deterministic
  // input-triggered server error — Blockaid gives no guarantee that adversarial failures return 4xx), or
  // any other 4xx. Treating a 5xx as transient would let a dapp craft an input that reliably 500s and
  // reach an ungated "couldn't verify" caution.
  let failureKind: BlockaidScanFailureKind
  let reason: BlockaidScanFailureReason
  if (isTimeout) {
    failureKind = 'transport'
    reason = 'timeout'
  } else if (httpStatus === 413) {
    failureKind = 'validation'
    reason = 'request_too_large'
  } else if (httpStatus === 429) {
    failureKind = 'transport'
    reason = 'rate_limited'
  } else if (httpStatus !== undefined && httpStatus >= 500) {
    failureKind = 'transport'
    reason = 'server_error'
  } else if (httpStatus !== undefined) {
    failureKind = 'validation'
    reason = 'request_rejected'
  } else {
    failureKind = 'transport'
    reason = 'transport_error'
  }
  // Anything with an HTTP status (or a timeout) is request-shaped/aimable and fails closed; only a
  // status-less connection error stays transient.
  const isPermanent = isTimeout || httpStatus !== undefined

  logger.warn('blockaidScanQuery', 'requireUsableScan', 'Blockaid scan request failed, blocking confirmation', {
    scanType,
    failureKind,
    httpStatus,
    isPermanent,
    reason,
  })

  throw new BlockaidScanUnusableError({ reason, isPermanent, failureKind, cause: error })
}

/**
 * Classifies a resolved-but-unusable scan, logs it for oncall, and throws. Every throw blocks
 * signing, so an outage surfaces as an alert rather than as "I can't sign anything" support tickets.
 */
function blockUnusableScan({
  hasResult,
  validation,
  simulation,
  requiresSimulation,
  scanType,
}: {
  hasResult: boolean
  validation: BlockaidScanTransactionResponse['validation']
  simulation: BlockaidScanTransactionResponse['simulation']
  requiresSimulation: boolean
  scanType: BlockaidScanType
}): never {
  const validationError = validation?.status === 'Error' ? validation.error : undefined
  const hasUsableValidation = validation?.status === 'Success'
  const failureKind: BlockaidScanFailureKind = hasUsableValidation ? 'simulation' : 'validation'
  // A resolved-but-unusable scan is always permanent (acknowledgement-gated). Every shape here is
  // request-shaped and recurs on retry of the identical request: a benign validation whose required
  // simulation failed (the dapp controls whether execution can be simulated, so a crafted revert trips
  // it deterministically), a validation the scanner rejected outright (any error code, known or not), or
  // a schema-invalid/absent response the API client reduced to null. Only genuine transport/offline
  // blips (throwRejectedScan) stay ungated, so an attacker cannot craft a request that lands here and
  // still reaches an ungated "couldn't verify" caution.
  const isPermanent = true

  let reason: BlockaidScanFailureReason
  if (!hasResult) {
    reason = 'no_response'
  } else if (!hasUsableValidation) {
    reason = validation?.status === 'Error' ? 'validation_error' : 'missing_validation'
  } else if (simulation?.status === 'Error') {
    reason = 'simulation_error'
  } else {
    reason = 'missing_simulation'
  }

  logger.warn('blockaidScanQuery', 'requireUsableScan', 'Blockaid scan is unusable, blocking confirmation', {
    scanType,
    validationStatus: validation?.status ?? 'missing',
    validationError,
    simulationStatus: requiresSimulation ? (simulation?.status ?? 'missing') : 'not-required',
    failureKind,
    isPermanent,
  })

  throw new BlockaidScanUnusableError({ reason, isPermanent, failureKind })
}

/**
 * Runs a Blockaid scan and throws unless it produced a usable verdict, which turns every failure
 * mode (transport, timeout, schema drift, validation failure, or required simulation failure)
 * into a blocked confirmation rather than a silent `TransactionRiskLevel.None`.
 */
export async function requireUsableScan({
  scan,
  scanType,
}: {
  scan: () => Promise<BlockaidScanTransactionResponse | null>
  scanType: BlockaidScanType
}): Promise<BlockaidScanTransactionResponse> {
  let result: BlockaidScanTransactionResponse | null
  try {
    result = await scan()
  } catch (error) {
    throwRejectedScan({ error, scanType })
  }
  const validation = result?.validation
  const simulation = result?.simulation
  const hasUsableValidation = validation?.status === 'Success'
  const requiresSimulation = scanType !== 'signature'
  const hasUsableSimulation = !requiresSimulation || simulation?.status === 'Success'
  // A usable validation that already reports a MALICIOUS (Critical) verdict must not be discarded just
  // because the (required) simulation failed: a known-malicious request whose simulation reverts — trivial
  // for an attacker to arrange — would otherwise be downgraded to a generic "couldn't verify" caution.
  // Surface only a Critical verdict here; everything else (benign, or a softer Warning) whose required
  // simulation failed falls through to the permanent scan-failure block. Scoping to Critical is
  // deliberate: a Warning with a failed simulation has no usable preview, and simulation success is
  // dapp-controllable, so a flagged payload must not be able to fail its own simulation to trade the
  // gated caution for an ungated Warning with an empty preview.
  // Reuse the exact all-legs derivation the confirmation UI renders (result_type + features[] +
  // classification), not just result_type — a malicious signal that lives only in features/classification
  // must still count.
  const hasMaliciousVerdict =
    hasUsableValidation && getRiskLevelFromValidation(validation) === TransactionRiskLevel.Critical

  if (result && hasUsableValidation && (hasUsableSimulation || hasMaliciousVerdict)) {
    return result
  }

  return blockUnusableScan({ hasResult: Boolean(result), validation, simulation, requiresSimulation, scanType })
}

export interface BlockaidScanFailureState {
  /** True when no usable scan verdict exists, including when the scan was never attempted. */
  hasScanFailed: boolean
  /**
   * True when retrying the same request cannot succeed. This is the default for any resolved-but-unusable
   * or request-shaped rejection: a schema-invalid/absent response, a rejected validation (any error
   * code), a validation that succeeded but whose required simulation failed, an oversized or otherwise
   * deterministically-rejected request, or a timeout. Only genuine transport/offline blips are transient.
   * Every permanent failure is attacker-aimable, so it gates confirmation behind an acknowledgement.
   */
  isScanFailurePermanent: boolean
}

/**
 * Derives the failure state consumers gate on. A scan that never ran is as unusable as one that
 * failed: with the query disabled React Query reports neither loading nor error, so without this
 * a missing request would read as "scanned, no risk".
 */
export function getScanFailureState({
  error,
  hasUsableScan,
  isScanEnabled,
  isPaused,
}: {
  error: Error | null
  hasUsableScan: boolean
  isScanEnabled: boolean
  isPaused: boolean
}): BlockaidScanFailureState {
  if (!isScanEnabled) {
    // A scan that never ran produced no verdict, and the reason it couldn't run is request-shaped (an
    // unsupported chain or unusable params that made the request un-buildable), so fail closed as
    // PERMANENT — the acknowledgement-gated path — not an ungated blip. Surfaces that deliberately can't
    // build a request pair this with a `localBlock`, which supersedes it, so this only hardens any path
    // that disables the scan without one.
    return { hasScanFailed: true, isScanFailurePermanent: true }
  }

  // React Query retains successful data when a background refetch fails or pauses. That cached
  // verdict is still the usable result for this exact request, so do not replace it with an error.
  if (hasUsableScan) {
    return { hasScanFailed: false, isScanFailurePermanent: false }
  }

  return {
    // An online-mode query pauses instead of erroring while offline. React Query then reports
    // neither `error` nor `isLoading`, so the paused state must fail closed explicitly.
    hasScanFailed: error !== null || isPaused,
    // Fail closed by default for an unexpected query error. Known connection-level failures are wrapped
    // as transient BlockaidScanUnusableErrors by requireUsableScan; an unclassified error must not silently
    // create a new ungated path if a future query function bypasses that boundary.
    isScanFailurePermanent: error !== null && isPermanentScanError(error),
  }
}
