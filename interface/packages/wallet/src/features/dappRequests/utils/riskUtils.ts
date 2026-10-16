import { TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'

interface ShouldDisableConfirmParams {
  /**
   * The current usable risk result.
   * `null` indicates that no confirmable result is available, including while a scan is pending or
   * when local validation cannot produce a safe scan request.
   */
  riskLevel: TransactionRiskLevel | null
  /**
   * Whether the user has confirmed they want to proceed despite a critical risk.
   */
  confirmedRisk: boolean
  /**
   * Whether a gas fee value is available.
   * Only required for transaction requests (not signature requests).
   */
  hasGasFee?: boolean
}

/**
 * Determines if the confirm button should be disabled based on risk scanning state.
 *
 * Disable confirm if:
 * - No confirmable risk result is available (riskLevel is null)
 * - There's a critical risk that hasn't been confirmed
 * - (For transactions) Gas fee is not available
 *
 * @param params - Parameters to determine if confirm should be disabled
 * @returns `true` if confirm should be disabled, `false` otherwise
 */
export function shouldDisableConfirm({ riskLevel, confirmedRisk, hasGasFee }: ShouldDisableConfirmParams): boolean {
  // For transaction requests, gas fee must be available
  if (hasGasFee !== undefined && !hasGasFee) {
    return true
  }

  // Disable confirm while there is no usable risk result.
  if (riskLevel === null) {
    return true
  }

  // Disable confirm if there's an unconfirmed critical risk
  const hasUnconfirmedCriticalRisk = riskLevel === TransactionRiskLevel.Critical && !confirmedRisk
  return hasUnconfirmedCriticalRisk
}
