import { DYNAMIC_FEE_AMOUNT, MAX_LP_FEE } from 'uniswap/src/constants/pools'
import { describe, expect, it } from 'vitest'
import { parseAsFeeData } from '~/features/Liquidity/parsers/urlParsers'

const parse = (fee: Record<string, unknown>): unknown => parseAsFeeData.parse(JSON.stringify(fee))

describe('parseAsFeeData', () => {
  it('accepts a static tier and passes it through', () => {
    expect(parse({ feeAmount: 3000, tickSpacing: 60, isDynamic: false })).toEqual({
      feeAmount: 3000,
      tickSpacing: 60,
      isDynamic: false,
    })
  })

  it('accepts the dynamic-fee flag, the one value allowed above the protocol cap', () => {
    expect(parse({ feeAmount: DYNAMIC_FEE_AMOUNT, tickSpacing: 60, isDynamic: true })).toEqual({
      feeAmount: DYNAMIC_FEE_AMOUNT,
      tickSpacing: 60,
      isDynamic: true,
    })
  })

  // Reconciled rather than trusted: the schema checks shape, so the flag and fee can disagree.
  it('pulls a flagged-dynamic tier onto the sentinel', () => {
    expect(parse({ feeAmount: 3000, tickSpacing: 60, isDynamic: true })).toEqual({
      feeAmount: DYNAMIC_FEE_AMOUNT,
      tickSpacing: 60,
      isDynamic: true,
    })
  })

  // Each of these reached the v4-sdk Pool constructor before and threw its invariant on render.
  // nuqs swallows a parser throw and yields null, so the param falls back to the default tier
  // rather than crashing the page.
  it.each([
    ['above the protocol cap', { feeAmount: 999_999_999, tickSpacing: 60, isDynamic: false }],
    ['NaN (JSON null coerced)', { feeAmount: null, tickSpacing: 60, isDynamic: false }],
    ['exactly at the cap', { feeAmount: MAX_LP_FEE, tickSpacing: 60, isDynamic: false }],
    ['between the cap and the sentinel', { feeAmount: 2_000_000, tickSpacing: 60, isDynamic: false }],
    ['negative', { feeAmount: -500, tickSpacing: 60, isDynamic: false }],
    ['fractional', { feeAmount: 30.5, tickSpacing: 60, isDynamic: false }],
    ['zero tick spacing', { feeAmount: 3000, tickSpacing: 0, isDynamic: false }],
    ['negative tick spacing', { feeAmount: 3000, tickSpacing: -60, isDynamic: false }],
  ])('rejects a fee %s', (_label, fee) => {
    expect(parse(fee)).toBeNull()
  })
})
