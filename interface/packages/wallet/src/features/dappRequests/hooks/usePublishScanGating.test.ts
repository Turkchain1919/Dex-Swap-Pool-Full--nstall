import { usePublishScanGating } from 'wallet/src/features/dappRequests/hooks/usePublishScanGating'
import { TransactionErrorType, TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import type { ScanGating } from 'wallet/src/features/dappRequests/utils/scanGating'
import { renderHook } from 'wallet/src/test/test-utils'

function gatingWith(overrides: Partial<ScanGating> = {}): ScanGating {
  return {
    parentRiskLevel: TransactionRiskLevel.None,
    previewRiskLevel: TransactionRiskLevel.None,
    footerRiskLevel: TransactionRiskLevel.None,
    errorType: undefined,
    onConfirmRisk: () => undefined,
    scanFailureError: undefined,
    ...overrides,
  }
}

describe('usePublishScanGating', () => {
  it('publishes the risk level and flags destructive styling for a genuine malicious verdict', () => {
    const onRiskLevelChange = vi.fn()
    const onCriticalRiskChange = vi.fn()

    renderHook(() =>
      usePublishScanGating({
        gating: gatingWith({
          parentRiskLevel: TransactionRiskLevel.Critical,
          footerRiskLevel: TransactionRiskLevel.Critical,
        }),
        onRiskLevelChange,
        onCriticalRiskChange,
        onConfirmRisk: vi.fn(),
      }),
    )

    expect(onRiskLevelChange).toHaveBeenLastCalledWith(TransactionRiskLevel.Critical)
    expect(onCriticalRiskChange).toHaveBeenLastCalledWith(true)
  })

  it('never flags destructive styling for a scan-failure caution', () => {
    const onCriticalRiskChange = vi.fn()

    renderHook(() =>
      usePublishScanGating({
        gating: gatingWith({
          parentRiskLevel: TransactionRiskLevel.Critical,
          footerRiskLevel: TransactionRiskLevel.Critical,
          scanFailureError: TransactionErrorType.ScanUnavailable,
        }),
        onRiskLevelChange: vi.fn(),
        onCriticalRiskChange,
        onConfirmRisk: vi.fn(),
      }),
    )

    expect(onCriticalRiskChange).toHaveBeenLastCalledWith(false)
  })

  // The reset-on-banner-identity-change leg is exercised end-to-end in
  // DappTransactionScanningContent.test.tsx ("resets the acknowledgement when a scan-failure caution
  // becomes a real verdict"), which drives the hook through a refetch transition.
})
