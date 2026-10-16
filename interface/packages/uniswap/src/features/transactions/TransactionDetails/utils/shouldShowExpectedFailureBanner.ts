import { TradingApi } from '@universe/api'

/**
 * Whether to show the expected-failure banner on review.
 *
 * A failed gas estimate is worth surfacing on every flow (send, wrap, bridge, swap) and gets
 * gas copy. Simulation and low-slippage reasons are swap-only — showing them elsewhere is what
 * made send review say "This swap may fail". See `ExpectedFailureBanner` for the copy split.
 */
export function shouldShowExpectedFailureBanner({
  isSwap,
  showGasFeeError,
  hasGasFeeError,
  txSimulationErrors,
}: {
  isSwap: boolean
  showGasFeeError: boolean
  hasGasFeeError: boolean
  txSimulationErrors?: TradingApi.TransactionFailureReason[]
}): boolean {
  if (showGasFeeError && hasGasFeeError) {
    return true
  }

  if (!isSwap) {
    return false
  }

  return Boolean(
    txSimulationErrors?.includes(TradingApi.TransactionFailureReason.SIMULATION_ERROR) ||
    txSimulationErrors?.includes(TradingApi.TransactionFailureReason.SLIPPAGE_TOO_LOW),
  )
}
