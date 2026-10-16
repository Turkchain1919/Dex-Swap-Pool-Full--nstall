import { TradingApi } from '@universe/api'
import { shouldShowExpectedFailureBanner } from 'uniswap/src/features/transactions/TransactionDetails/utils/shouldShowExpectedFailureBanner'

describe('shouldShowExpectedFailureBanner', () => {
  it('should show on swap flows when gas estimation fails', () => {
    expect(
      shouldShowExpectedFailureBanner({
        isSwap: true,
        showGasFeeError: true,
        hasGasFeeError: true,
      }),
    ).toBe(true)
  })

  it('should show on non-swap flows when gas estimation fails', () => {
    expect(
      shouldShowExpectedFailureBanner({
        isSwap: false,
        showGasFeeError: true,
        hasGasFeeError: true,
      }),
    ).toBe(true)
  })

  it('should not show when gas fee error display is disabled', () => {
    expect(
      shouldShowExpectedFailureBanner({
        isSwap: false,
        showGasFeeError: false,
        hasGasFeeError: true,
      }),
    ).toBe(false)
  })

  it('should not show simulation or slippage failures on non-swap flows', () => {
    expect(
      shouldShowExpectedFailureBanner({
        isSwap: false,
        showGasFeeError: true,
        hasGasFeeError: false,
        txSimulationErrors: [TradingApi.TransactionFailureReason.SIMULATION_ERROR],
      }),
    ).toBe(false)

    expect(
      shouldShowExpectedFailureBanner({
        isSwap: false,
        showGasFeeError: true,
        hasGasFeeError: false,
        txSimulationErrors: [TradingApi.TransactionFailureReason.SLIPPAGE_TOO_LOW],
      }),
    ).toBe(false)
  })

  it('should show simulation and slippage failures on swap flows', () => {
    expect(
      shouldShowExpectedFailureBanner({
        isSwap: true,
        showGasFeeError: false,
        hasGasFeeError: false,
        txSimulationErrors: [TradingApi.TransactionFailureReason.SIMULATION_ERROR],
      }),
    ).toBe(true)

    expect(
      shouldShowExpectedFailureBanner({
        isSwap: true,
        showGasFeeError: false,
        hasGasFeeError: false,
        txSimulationErrors: [TradingApi.TransactionFailureReason.SLIPPAGE_TOO_LOW],
      }),
    ).toBe(true)
  })

  it('should not show when there are no failures at all', () => {
    expect(
      shouldShowExpectedFailureBanner({
        isSwap: true,
        showGasFeeError: true,
        hasGasFeeError: false,
        txSimulationErrors: [],
      }),
    ).toBe(false)
  })

  it('should ignore unrelated simulation failure reasons on swap flows', () => {
    expect(
      shouldShowExpectedFailureBanner({
        isSwap: true,
        showGasFeeError: true,
        hasGasFeeError: false,
        txSimulationErrors: [TradingApi.TransactionFailureReason.UNSUPPORTED_SIMULATION],
      }),
    ).toBe(false)
  })
})
