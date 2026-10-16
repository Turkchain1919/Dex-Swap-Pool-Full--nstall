import type { LocalizationContextState } from 'uniswap/src/features/language/LocalizationContext'
import { NumberType } from 'utilities/src/format/types'
import { describe, expect, it } from 'vitest'
import { formatUsdTotal } from '~/features/Liquidity/utils/formatUsdTotal'

// NumberType-aware stub mirroring the real FiatTokenDetails bands (three decimals under $1.05,
// plain two decimals to $1M, abbreviated above) so the display/full divergences are reachable.
const convertFiatAmountFormatted = ((value: number, type: NumberType): string => {
  if (type === NumberType.FiatTokenQuantity) {
    return value < 0.01 ? '<$0.01' : `$${value}`
  }
  if (type === NumberType.FiatTokenDetails) {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`
    }
    return value < 1.05 ? `$${value.toFixed(3)}` : `$${value.toFixed(2)}`
  }
  return `$${value.toFixed(2)}`
}) as LocalizationContextState['convertFiatAmountFormatted']

describe('formatUsdTotal', () => {
  it('renders a dash when the value is unknown', () => {
    expect(formatUsdTotal(undefined, convertFiatAmountFormatted)).toEqual({ display: '-' })
  })

  it('keeps the $0.00 form for exact zero instead of truncating', () => {
    expect(formatUsdTotal(0, convertFiatAmountFormatted).display).toBe('$0.00')
  })

  it('routes sub-cent values through FiatTokenQuantity as <$0.01', () => {
    expect(formatUsdTotal(0.003, convertFiatAmountFormatted).display).toBe('<$0.01')
  })

  it('adds the untruncated figure only when it differs from the display form', () => {
    expect(formatUsdTotal(268.9, convertFiatAmountFormatted)).toEqual({ display: '$268.90', full: undefined })
    expect(formatUsdTotal(1234567, convertFiatAmountFormatted)).toEqual({
      display: '$1.23M',
      full: '$1234567.00',
    })
  })

  it('omits the tooltip figure under the threshold even when the forms differ', () => {
    expect(formatUsdTotal(0.567, convertFiatAmountFormatted)).toEqual({ display: '$0.567' })
    // The $1.0x band displays three decimals; the 2-decimal tooltip would be less precise.
    expect(formatUsdTotal(1.043, convertFiatAmountFormatted)).toEqual({ display: '$1.043' })
  })
})
