import { TransactionErrorType, TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import { deriveScanGating } from 'wallet/src/features/dappRequests/utils/scanGating'

const onConfirmRisk = (): void => undefined

describe('deriveScanGating', () => {
  it('publishes the scanned verdict once a usable scan lands', () => {
    expect(
      deriveScanGating({
        riskLevel: TransactionRiskLevel.Critical,
        hasScanFailed: false,
        isScanFailurePermanent: false,
        isLoading: false,
        onConfirmRisk,
      }),
    ).toEqual({
      parentRiskLevel: TransactionRiskLevel.Critical,
      previewRiskLevel: TransactionRiskLevel.Critical,
      footerRiskLevel: TransactionRiskLevel.Critical,
      errorType: undefined,
      onConfirmRisk,
      scanFailureError: undefined,
    })
  })

  it('withholds the verdict while the scan is in flight', () => {
    const gating = deriveScanGating({
      riskLevel: TransactionRiskLevel.None,
      hasScanFailed: false,
      isScanFailurePermanent: false,
      isLoading: true,
      onConfirmRisk,
    })

    expect(gating.parentRiskLevel).toBeNull()
    expect(gating.errorType).toBeUndefined()
  })

  it('folds a local hard block into every confirmation gate', () => {
    expect(
      deriveScanGating({
        riskLevel: TransactionRiskLevel.None,
        hasScanFailed: true,
        isScanFailurePermanent: false,
        isLoading: false,
        fallbackErrorType: TransactionErrorType.DecodeTransaction,
        localBlock: {
          errorType: TransactionErrorType.UnverifiedRecipient,
          previewRiskLevel: TransactionRiskLevel.Critical,
        },
        onConfirmRisk,
      }),
    ).toEqual({
      parentRiskLevel: null,
      previewRiskLevel: TransactionRiskLevel.Critical,
      footerRiskLevel: TransactionRiskLevel.None,
      errorType: TransactionErrorType.UnverifiedRecipient,
      onConfirmRisk: undefined,
      scanFailureError: undefined,
    })
  })

  it('gates a permanently unscannable request behind an acknowledgement', () => {
    // Permanent failures are attacker-forceable, so they stay on the critical acknowledgement rails
    // (disabled until confirmed) with the high-severity caution.
    expect(
      deriveScanGating({
        riskLevel: TransactionRiskLevel.Critical,
        hasScanFailed: true,
        isScanFailurePermanent: true,
        isLoading: false,
        fallbackErrorType: TransactionErrorType.DecodeTransaction,
        onConfirmRisk,
      }),
    ).toEqual({
      parentRiskLevel: TransactionRiskLevel.Critical,
      previewRiskLevel: TransactionRiskLevel.None,
      footerRiskLevel: TransactionRiskLevel.Critical,
      errorType: undefined,
      onConfirmRisk,
      scanFailureError: TransactionErrorType.ScanUnavailable,
    })
  })

  it('surfaces a transient scan failure as an informational caution that does not gate confirmation', () => {
    // A transient failure is an un-aimable blip, not known-malicious, so it publishes no gating verdict
    // (None, not Critical) and confirmation stays enabled — the footer still shows the caution via the
    // carried error. `onConfirmRisk` is still forwarded (the typed-data non-standard path relies on it),
    // but no scan-failure checkbox is required. A simulation failure is not transient: it is classified
    // permanent upstream (getScanFailureState), so it never reaches this branch.
    expect(
      deriveScanGating({
        riskLevel: TransactionRiskLevel.None,
        hasScanFailed: true,
        isScanFailurePermanent: false,
        isLoading: false,
        fallbackErrorType: TransactionErrorType.DecodeTransaction,
        onConfirmRisk,
      }),
    ).toEqual({
      parentRiskLevel: TransactionRiskLevel.None,
      previewRiskLevel: TransactionRiskLevel.None,
      footerRiskLevel: TransactionRiskLevel.None,
      errorType: undefined,
      onConfirmRisk,
      scanFailureError: TransactionErrorType.ScanFailed,
    })
  })

  it('uses a fallback display error only after the scan gates pass', () => {
    expect(
      deriveScanGating({
        riskLevel: TransactionRiskLevel.None,
        hasScanFailed: false,
        isScanFailurePermanent: false,
        isLoading: false,
        fallbackErrorType: TransactionErrorType.DecodeTransaction,
        onConfirmRisk,
      }).errorType,
    ).toBe(TransactionErrorType.DecodeTransaction)
  })
})
