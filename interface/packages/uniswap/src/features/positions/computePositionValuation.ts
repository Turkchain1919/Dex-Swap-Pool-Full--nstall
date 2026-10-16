import { Currency, CurrencyAmount } from '@uniswap/sdk-core'

// USD value = sum of each token's human amount * its USD price. Undefined when
// either token price is missing (no fresh price row) — the UI shows "–" then.
// Position amounts come from the SDK; prices are the raw current_token_prices
// the backend enriches onto the Position (Tier 2a). Fees/APR remain unserved.
export function computeTotalValueUsd({
  currency0Amount,
  currency1Amount,
  price0Usd,
  price1Usd,
}: {
  currency0Amount: CurrencyAmount<Currency>
  currency1Amount: CurrencyAmount<Currency>
  price0Usd?: string
  price1Usd?: string
}): number | undefined {
  if (price0Usd === undefined || price1Usd === undefined) {
    return undefined
  }
  const p0 = Number(price0Usd)
  const p1 = Number(price1Usd)
  if (!Number.isFinite(p0) || !Number.isFinite(p1)) {
    return undefined
  }
  return Number(currency0Amount.toExact()) * p0 + Number(currency1Amount.toExact()) * p1
}
