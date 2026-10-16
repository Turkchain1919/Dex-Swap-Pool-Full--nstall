import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { convertScientificNotationToNumber } from 'utilities/src/format/convertScientificNotation'
import { parseUnits } from '~/chains'

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** Names what was rejected without echoing anything but a primitive: type for non-numbers, value for numbers. */
function describeRejectedAmount(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  return typeof value === 'number' ? String(value) : typeof value
}

function countFractionDigits(plainDecimal: string): number {
  return plainDecimal.split('.')[1]?.length ?? 0
}

/**
 * Converts a fiat off-ramp `baseCurrencyAmount` — a JS `number` from the FOR
 * `OffRampTransferDetailsResponse` — into a `CurrencyAmount` of the token being sold.
 *
 * The raw amount is signed and sent on-chain, so it is derived from the number's shortest
 * round-trip decimal string (`String(n)`, with exponential notation expanded) and `parseUnits`,
 * never from float arithmetic or `toFixed`: `amount * 10 ** decimals` is inexact in float64 for most
 * real sell amounts (`0.00403325 * 10 ** 18` is `4033250000000000.5`, `1.1 * 10 ** 18` is
 * `1100000000000000128`), and `toFixed(18)` prints the double's binary expansion
 * (`(2.34).toFixed(18)` is `'2.339999999999999858'`), not the decimal the provider sent.
 *
 * Throws instead of substituting a value — a transfer for a silently different amount is worse
 * than a transfer that fails — when the amount is not a positive finite `number` (the API layer
 * casts raw JSON, so `undefined` can reach here despite the type), or when its decimal string has
 * more fraction digits than the token has `decimals`. There is no rounding: `0.5` of a 0-decimal
 * token and `4e-7` of a 6-decimal token both throw rather than transfer a whole unit or nothing.
 */
export function getOffRampTransferCurrencyAmount<T extends Currency>({
  baseCurrencyAmount,
  currency,
}: {
  baseCurrencyAmount: number
  currency: T
}): CurrencyAmount<T> {
  if (!isPositiveFiniteNumber(baseCurrencyAmount)) {
    throw new Error(
      `Off-ramp transfer amount must be a positive finite number, received ${describeRejectedAmount(baseCurrencyAmount)}`,
    )
  }

  const plainAmount = convertScientificNotationToNumber(String(baseCurrencyAmount))

  const fractionDigits = countFractionDigits(plainAmount)
  if (fractionDigits > currency.decimals) {
    throw new Error(
      `Off-ramp transfer amount ${plainAmount} has ${fractionDigits} fraction digits but the token only has ${currency.decimals} decimals`,
    )
  }

  // Unreachable after the guards above; kept so a change in the `parseUnits` implementation can
  // never turn a bad provider amount into a zero-value transfer.
  const rawAmount = parseUnits(plainAmount, currency.decimals)
  if (rawAmount <= 0n) {
    throw new Error(`Off-ramp transfer amount ${plainAmount} is below the smallest unit of the token`)
  }

  return CurrencyAmount.fromRawAmount(currency, rawAmount.toString())
}
