import type { TradingApi } from '@universe/api'
import { buildUrgency } from 'uniswap/src/features/transactions/swap/utils/tradingApi'

/** Gas-pricing fields every earn TAPI quote request must carry (same tier swaps use —
 *  see `createBuildQuoteRequest`). Omitting urgency makes the server price the plan's
 *  txRequests at its NORMAL fallback tier, which leaves near-zero base-fee headroom
 *  on Arbitrum-family chains and gets sends rejected with "max fee per gas less than
 *  block base fee". */
export function buildEarnQuoteGasParams({
  gasOverrides,
}: {
  gasOverrides?: TradingApi.UrgencyOverrides
} = {}): Pick<TradingApi.QuoteRequest, 'urgency'> {
  return { urgency: buildUrgency(gasOverrides) }
}
