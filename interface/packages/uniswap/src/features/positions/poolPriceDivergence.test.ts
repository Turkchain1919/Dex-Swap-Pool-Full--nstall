import { CurrencyAmount, Fraction, Price, Token } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import JSBI from 'jsbi'
import { nativeOnChain } from 'uniswap/src/constants/tokens'
import { USDT } from 'uniswap/src/constants/tokens'
import {
  getMarketPriceFromUsdPrices,
  getPoolPriceDivergence,
  getPriceFromSqrtPriceX96,
  PRICE_DECIMAL_SCALAR,
  scaleUsdUnitValue,
} from 'uniswap/src/features/positions/poolPriceDivergence'
import { describe, expect, it } from 'vitest'

const ETH_MAINNET = nativeOnChain(UniverseChainId.Mainnet)

function scaled(value: number): JSBI {
  return JSBI.multiply(JSBI.BigInt(value), PRICE_DECIMAL_SCALAR)
}

// 1 ETH = 100 USDT
const POOL_PRICE = new Price(
  ETH_MAINNET,
  USDT,
  JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(18)).toString(),
  (100 * 10 ** USDT.decimals).toString(),
)

describe('scaleUsdUnitValue', () => {
  it('scales a stablecoin amount to an integer', () => {
    const amount = CurrencyAmount.fromRawAmount(USDT, (100 * 10 ** USDT.decimals).toString())
    expect(scaleUsdUnitValue(amount)?.toString()).toBe('100000000000000000000')
  })

  it('returns undefined when the amount rounds to zero', () => {
    const amount = CurrencyAmount.fromRawAmount(USDT, '0')
    expect(scaleUsdUnitValue(amount)).toBeUndefined()
  })
})

describe('getMarketPriceFromUsdPrices', () => {
  it('returns the quote-per-base exchange rate', () => {
    const marketPrice = getMarketPriceFromUsdPrices({
      baseUsdScaled: scaled(100),
      quoteUsdScaled: scaled(1),
    })
    expect(marketPrice?.toSignificant(6)).toBe('100')
  })

  it('returns undefined when either USD price is missing', () => {
    expect(getMarketPriceFromUsdPrices({ baseUsdScaled: scaled(100), quoteUsdScaled: undefined })).toBeUndefined()
    expect(getMarketPriceFromUsdPrices({ baseUsdScaled: undefined, quoteUsdScaled: scaled(1) })).toBeUndefined()
  })
})

describe('getPoolPriceDivergence', () => {
  it('is in sync when pool and market price match', () => {
    const result = getPoolPriceDivergence({ poolPrice: POOL_PRICE, marketPrice: new Fraction(100) })
    expect(result).toEqual({ isOutOfSync: false, divergencePercent: 0 })
  })

  it('is in sync when divergence is within the 5% threshold', () => {
    const result = getPoolPriceDivergence({ poolPrice: POOL_PRICE, marketPrice: new Fraction(104) })
    expect(result?.isOutOfSync).toBe(false)
    expect(result?.divergencePercent).toBeCloseTo(3.85, 2)
  })

  it('is out of sync when the pool price is more than 5% above the market price', () => {
    const result = getPoolPriceDivergence({ poolPrice: POOL_PRICE, marketPrice: new Fraction(90) })
    expect(result?.isOutOfSync).toBe(true)
    expect(result?.divergencePercent).toBeCloseTo(11.11, 2)
  })

  it('is out of sync when the pool price is more than 5% below the market price', () => {
    const result = getPoolPriceDivergence({ poolPrice: POOL_PRICE, marketPrice: new Fraction(200) })
    expect(result?.isOutOfSync).toBe(true)
    expect(result?.divergencePercent).toBeCloseTo(50, 2)
  })

  it('reports a degenerate pool price (extreme-decimals token at MAX tick) as out of sync instead of failing open', () => {
    const extremeDecimalsToken = new Token(
      UniverseChainId.Mainnet,
      '0x0000000000000000000000000000000000000001',
      24,
      'EXT',
      'Extreme',
    )
    // Raw price ratio at MAX tick (~2^128): quoting 1 unit of a 24-decimals base overflows MaxUint256 once scaled.
    // A pool price too extreme to quote can't be trusted — it must warn, not silently read as in sync.
    const maxTickPoolPrice = new Price(
      extremeDecimalsToken,
      USDT,
      1,
      JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(128)).toString(),
    )
    expect(getPoolPriceDivergence({ poolPrice: maxTickPoolPrice, marketPrice: new Fraction(100) })).toEqual({
      isOutOfSync: true,
      divergencePercent: Infinity,
    })
  })

  it('returns undefined when the market price rounds to zero', () => {
    const result = getPoolPriceDivergence({
      poolPrice: POOL_PRICE,
      marketPrice: new Fraction(1, JSBI.multiply(PRICE_DECIMAL_SCALAR, JSBI.BigInt(10))),
    })
    expect(result).toBeUndefined()
  })
})

describe('getPriceFromSqrtPriceX96', () => {
  const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96))

  it('returns the decimal-adjusted token1-per-token0 price', () => {
    // sqrtPrice = 2 * 2^96 -> raw price 4; equal decimals keep it as-is
    const sqrtPriceX96 = JSBI.multiply(JSBI.BigInt(2), Q96).toString()
    const price = getPriceFromSqrtPriceX96({ sqrtPriceX96, token0Decimals: 18, token1Decimals: 18 })
    expect(price?.toSignificant(6)).toBe('4')
  })

  it('adjusts for differing token decimals', () => {
    // Raw price 4 between an 18-decimals token0 and a 6-decimals token1 -> decimal-adjusted 4e12 * 1e-... = 4 * 10^12
    const sqrtPriceX96 = JSBI.multiply(JSBI.BigInt(2), Q96).toString()
    const price = getPriceFromSqrtPriceX96({ sqrtPriceX96, token0Decimals: 18, token1Decimals: 6 })
    expect(price?.toSignificant(6)).toBe('4000000000000')
  })

  it('returns undefined for zero or malformed input', () => {
    expect(getPriceFromSqrtPriceX96({ sqrtPriceX96: '0', token0Decimals: 18, token1Decimals: 18 })).toBeUndefined()
    expect(
      getPriceFromSqrtPriceX96({ sqrtPriceX96: 'not-a-number', token0Decimals: 18, token1Decimals: 18 }),
    ).toBeUndefined()
  })
})
