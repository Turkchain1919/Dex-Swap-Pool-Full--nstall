import { act } from '@testing-library/react-native'
import { TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import { renderHook } from 'wallet/src/test/test-utils'
import { useTypedDataWarningConfirmation } from './useTypedDataWarningConfirmation'

describe('useTypedDataWarningConfirmation', () => {
  it('does not expose acknowledgement handlers when confirmation is blocked', () => {
    const { result } = renderHook(() =>
      useTypedDataWarningConfirmation({
        isNonStandard: true,
        riskLevel: TransactionRiskLevel.None,
        confirmedRisk: false,
      }),
    )

    expect(result.current.handleNonStandardConfirm).toBeUndefined()
    expect(result.current.handleRiskConfirm).toBeUndefined()
  })

  it('exposes acknowledgement handlers when confirmation is allowed', () => {
    const { result } = renderHook(() =>
      useTypedDataWarningConfirmation({
        isNonStandard: true,
        riskLevel: TransactionRiskLevel.Critical,
        confirmedRisk: false,
        onConfirmRisk: vi.fn(),
      }),
    )

    expect(result.current.handleNonStandardConfirm).toEqual(expect.any(Function))
    expect(result.current.handleRiskConfirm).toEqual(expect.any(Function))
  })

  // A scan failure raises the gated risk level to Critical, so a non-standard request must require
  // BOTH the irregular-signature box and the risk acknowledgement before a confirmation is published.
  it('requires both acknowledgements when non-standard and the risk level is critical', () => {
    const onConfirmRisk = vi.fn()
    const { result } = renderHook(() =>
      useTypedDataWarningConfirmation({
        isNonStandard: true,
        riskLevel: TransactionRiskLevel.Critical,
        confirmedRisk: false,
        onConfirmRisk,
      }),
    )

    act(() => result.current.handleNonStandardConfirm?.(true))
    // Irregular-signature box alone is not enough — the scan-failure acknowledgement is still missing.
    expect(onConfirmRisk).toHaveBeenLastCalledWith(false)

    act(() => result.current.handleRiskConfirm?.(true))
    expect(onConfirmRisk).toHaveBeenLastCalledWith(true)
  })

  // Guards the regression the fix addresses: with a non-critical level the irregular-signature box
  // alone publishes a confirmation, which is exactly why the gated (footer) risk level — Critical on
  // a scan failure — must be passed in rather than the raw scan risk level (None on a failed scan).
  it('lets the irregular-signature box alone confirm when the risk level is not critical', () => {
    const onConfirmRisk = vi.fn()
    const { result } = renderHook(() =>
      useTypedDataWarningConfirmation({
        isNonStandard: true,
        riskLevel: TransactionRiskLevel.None,
        confirmedRisk: false,
        onConfirmRisk,
      }),
    )

    act(() => result.current.handleNonStandardConfirm?.(true))
    expect(onConfirmRisk).toHaveBeenLastCalledWith(true)
  })
})
