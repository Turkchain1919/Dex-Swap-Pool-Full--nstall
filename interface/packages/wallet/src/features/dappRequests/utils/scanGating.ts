import { TransactionErrorType, TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'

interface DeriveScanGatingParams {
  /** Risk level parsed out of the Blockaid scan result. */
  riskLevel: TransactionRiskLevel
  /** True when there is no usable scan verdict, including a scan that was never attempted. */
  hasScanFailed: boolean
  /**
   * True when retrying the same request cannot succeed — the default for any resolved-but-unusable or
   * request-shaped rejection (rejected/unknown validation, schema-invalid response, failed required
   * simulation, oversized or deterministically-rejected request, timeout). Only genuine transport/offline
   * blips are transient. All permanent failures gate confirmation. Required (no fail-open default): an
   * omitted value must never silently read as transient/ungated, so every caller states it explicitly.
   */
  isScanFailurePermanent: boolean
  isLoading: boolean
  /** A local validation failure that must block before a scan can produce a trustworthy verdict. */
  localBlock?: {
    errorType: TransactionErrorType
    previewRiskLevel: TransactionRiskLevel
  }
  /** Lower-priority display error used only when neither a local nor scan hard block applies. */
  fallbackErrorType?: TransactionErrorType
  /** The parent's acknowledgement callback, forwarded only when acknowledging is safe. */
  onConfirmRisk: (confirmed: boolean) => void
}

export interface ScanGating {
  /** Risk level published to the request parent. `null` blocks confirmation. */
  parentRiskLevel: TransactionRiskLevel | null
  /** Risk level shown in the request preview. */
  previewRiskLevel: TransactionRiskLevel
  /** Risk level shown in the footer. A local hard block never exposes an acknowledgement path. */
  footerRiskLevel: TransactionRiskLevel
  /** Error describing why confirmation is blocked, if any. */
  errorType: TransactionErrorType | undefined
  /** Acknowledgement handler, `undefined` when there is nothing safe to acknowledge through. */
  onConfirmRisk: ((confirmed: boolean) => void) | undefined
  /**
   * Set for any scan-failure caution the footer should surface. `ScanUnavailable` marks a permanent
   * failure (retry cannot help) that is gated behind an acknowledgement checkbox; `ScanFailed` is a
   * transient, informational caution (shown, but no gate). Undefined for every non-scan-failure outcome.
   */
  scanFailureError: TransactionErrorType | undefined
}

/**
 * Single source of the scan-gating contract every request-confirmation surface shares. A local
 * hard block — an unverifiable target that would let Blockaid fail open — publishes no verdict and
 * offers no acknowledgement. A permanently unscannable request is surfaced as an acknowledgeable
 * caution (confirmation stays disabled until the user accepts it). A transient scan failure is an
 * un-aimable blip, so it surfaces as an informational caution that does not gate confirmation.
 * Deriving every leg together stops a new surface from implementing only some of them.
 */
export function deriveScanGating({
  riskLevel,
  hasScanFailed,
  isScanFailurePermanent,
  isLoading,
  localBlock,
  fallbackErrorType,
  onConfirmRisk,
}: DeriveScanGatingParams): ScanGating {
  if (localBlock) {
    return {
      parentRiskLevel: null,
      previewRiskLevel: localBlock.previewRiskLevel,
      footerRiskLevel: TransactionRiskLevel.None,
      errorType: localBlock.errorType,
      onConfirmRisk: undefined,
      scanFailureError: undefined,
    }
  }

  if (hasScanFailed) {
    // A permanent failure (the default — retry of the identical request can never help: a rejected or
    // unknown validation, a schema-invalid response, a validated-but-unsimulatable request, an oversized
    // or deterministically-rejected request, or a timeout) is attacker-forceable, so it stays gated
    // behind an explicit acknowledgement: Critical rails, the high-severity caution, and a checkbox.
    // A transient failure (Blockaid briefly unreachable / offline) is an un-aimable blip, so it surfaces
    // as an informational caution that does NOT gate confirmation — no checkbox, Approve stays enabled. A
    // genuine malicious verdict never reaches either branch (requireUsableScan surfaces it), so nothing
    // known-bad is downgraded. `onConfirmRisk` is forwarded in both cases so the typed-data non-standard
    // acknowledgement path is unaffected.
    if (isScanFailurePermanent) {
      return {
        parentRiskLevel: TransactionRiskLevel.Critical,
        previewRiskLevel: TransactionRiskLevel.None,
        footerRiskLevel: TransactionRiskLevel.Critical,
        errorType: undefined,
        onConfirmRisk,
        scanFailureError: TransactionErrorType.ScanUnavailable,
      }
    }
    return {
      parentRiskLevel: TransactionRiskLevel.None,
      previewRiskLevel: TransactionRiskLevel.None,
      footerRiskLevel: TransactionRiskLevel.None,
      errorType: undefined,
      onConfirmRisk,
      scanFailureError: TransactionErrorType.ScanFailed,
    }
  }

  return {
    parentRiskLevel: isLoading ? null : riskLevel,
    previewRiskLevel: riskLevel,
    footerRiskLevel: riskLevel,
    errorType: fallbackErrorType,
    onConfirmRisk,
    scanFailureError: undefined,
  }
}
