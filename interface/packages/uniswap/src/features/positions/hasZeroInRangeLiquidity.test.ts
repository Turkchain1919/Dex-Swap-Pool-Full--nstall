import { CurrencyAmount } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import { encodeSqrtRatioX96, FeeAmount, TICK_SPACINGS, Pool as V3Pool } from '@uniswap/v3-sdk'
import { Pool as V4Pool } from '@uniswap/v4-sdk'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { DAI } from 'uniswap/src/constants/tokens'
import { hasZeroInRangeLiquidity } from 'uniswap/src/features/positions/hasZeroInRangeLiquidity'
import { WETH } from 'uniswap/src/test/fixtures/lib/sdk'
import { describe, expect, it } from 'vitest'

const SQRT_RATIO_1_1 = encodeSqrtRatioX96(1, 1)

function buildV3Pool(liquidity: string): V3Pool {
  return new V3Pool(DAI, WETH, FeeAmount.MEDIUM, SQRT_RATIO_1_1, liquidity, 0)
}

function buildV4Pool(liquidity: string): V4Pool {
  return new V4Pool(
    DAI,
    WETH,
    FeeAmount.MEDIUM,
    TICK_SPACINGS[FeeAmount.MEDIUM],
    ZERO_ADDRESS,
    SQRT_RATIO_1_1,
    liquidity,
    0,
  )
}

describe('hasZeroInRangeLiquidity', () => {
  it('returns false for undefined', () => {
    expect(hasZeroInRangeLiquidity(undefined)).toBe(false)
  })

  it('returns false for a v2 pair regardless of reserves', () => {
    const pair = new Pair(CurrencyAmount.fromRawAmount(DAI, '0'), CurrencyAmount.fromRawAmount(WETH, '0'))
    expect(hasZeroInRangeLiquidity(pair)).toBe(false)
  })

  it('returns true for a v3 pool with zero in-range liquidity', () => {
    expect(hasZeroInRangeLiquidity(buildV3Pool('0'))).toBe(true)
  })

  it('returns false for a v3 pool with in-range liquidity', () => {
    expect(hasZeroInRangeLiquidity(buildV3Pool('1000000'))).toBe(false)
  })

  it('returns true for a v4 pool with zero in-range liquidity', () => {
    expect(hasZeroInRangeLiquidity(buildV4Pool('0'))).toBe(true)
  })

  it('returns false for a v4 pool with in-range liquidity', () => {
    expect(hasZeroInRangeLiquidity(buildV4Pool('1'))).toBe(false)
  })
})
