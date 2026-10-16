import { useEffect } from 'react'
import { TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import type { ScanGating } from 'wallet/src/features/dappRequests/utils/scanGating'

/**
 * Publishes a `deriveScanGating` result to the request parent, and enforces the two invariants every
 * scanning surface shares — so a new surface can't adopt the gating contract while forgetting one:
 *
 * 1. Report the parent risk level, plus whether the confirm button should get destructive styling (only
 *    a genuine malicious verdict does; a scan-failure caution never does).
 * 2. Reset the acknowledgement whenever the shown banner changes identity (`footerRiskLevel` /
 *    `scanFailureError`). An acknowledgement applies only to the banner it was given for: if an
 *    already-acknowledged permanent scan-failure caution is replaced by a real malicious verdict after a
 *    later successful refetch, the Critical banner must not render pre-confirmed with Confirm enabled.
 *
 * `onConfirmRisk` is the setter that clears the risk acknowledgement when called with `false`. Most
 * surfaces pass the parent's acknowledgement setter directly. A surface that owns its own risk-ack
 * sub-state (the typed-data surface, whose `useTypedDataWarningConfirmation` tracks `confirmedRiskWarning`
 * independently) must pass THAT hook's risk setter (`handleRiskConfirm`) instead — resetting the parent
 * prop alone is a no-op there when the merged confirmation is already `false`. Optional: a surface that
 * offers no acknowledgement path (a local hard block) has nothing to reset.
 */
export function usePublishScanGating({
  gating,
  onRiskLevelChange,
  onCriticalRiskChange,
  onConfirmRisk,
}: {
  gating: ScanGating
  onRiskLevelChange: (riskLevel: TransactionRiskLevel | null) => void
  onCriticalRiskChange?: (isCriticalRisk: boolean) => void
  onConfirmRisk?: (confirmed: boolean) => void
}): void {
  const { parentRiskLevel, scanFailureError, footerRiskLevel } = gating
  const isCriticalRisk = parentRiskLevel === TransactionRiskLevel.Critical && !scanFailureError

  useEffect(() => {
    onRiskLevelChange(parentRiskLevel)
    onCriticalRiskChange?.(isCriticalRisk)
  }, [parentRiskLevel, isCriticalRisk, onRiskLevelChange, onCriticalRiskChange])

  useEffect(() => {
    onConfirmRisk?.(false)
  }, [footerRiskLevel, scanFailureError, onConfirmRisk])
}
