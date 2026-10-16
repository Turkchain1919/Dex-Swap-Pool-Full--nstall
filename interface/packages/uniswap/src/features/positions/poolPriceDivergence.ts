import { parseUnits } from '@ethersproject/units'
import { Currency, CurrencyAmount, Fraction, Price, Token } from '@uniswap/sdk-core'
import { priceToClosestTick as priceToClosestV3Tick, Pool as V3Pool } from '@uniswap/v3-sdk'
import { priceToClosestTick as priceToClosestV4Tick, Pool as V4Pool } from '@uniswap/v4-sdk'
import JSBI from 'jsbi'

// Warn when the pool price diverges from the market price by more than 5%
export const POOL_OUT_OF_SYNC_THRESHOLD = new Fraction(5, 100)

const SCALING_DECIMALS = 18
// Scales decimal values to integers before operating on them
export const PRICE_DECIMAL_SCALAR = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(SCALING_DECIMALS))

/** Scales the USD value of 1 unit of a token (from the price service) by PRICE_DECIMAL_SCALAR. */
export function scaleUsdUnitValue(usdValue: CurrencyAmount<Currency>): JSBI | undefined {
  const scaled = JSBI.BigInt(usdValue.multiply(PRICE_DECIMAL_SCALAR).toFixed(0))
  return JSBI.equal(scaled, JSBI.BigInt(0)) ? undefined : scaled
}

/**
 * Market exchange rate between two tokens derived from their USD unit prices,
 * quoted as decimal-adjusted units of quote token per base token.
 */
export function getMarketPriceFromUsdPrices({
  baseUsdScaled,
  quoteUsdScaled,
}: {
  baseUsdScaled?: JSBI
  quoteUsdScaled?: JSBI
}): Fraction | undefined {
  if (!baseUsdScaled || !quoteUsdScaled) {
    return undefined
  }

  return new Fraction(baseUsdScaled, quoteUsdScaled)
}

/**
 * Compares a pool's own price against the market exchange rate of its tokens.
 * Undefined only when the market price is unusable as a reference (rounds to zero at the working
 * precision) — never because of the pool price: a pool price too extreme for the SDK to quote is
 * reported as out of sync, not skipped.
 * @param poolPrice pool price (quote per base) from slot0/reserves
 * @param marketPrice decimal-adjusted market exchange rate in the same quote/base orientation
 */
export function getPoolPriceDivergence({
  poolPrice,
  marketPrice,
}: {
  poolPrice: Price<Currency, Currency>
  marketPrice: Fraction
}): { isOutOfSync: boolean; divergencePercent: number } | undefined {
  const scaledMarketPrice = JSBI.BigInt(marketPrice.multiply(PRICE_DECIMAL_SCALAR).toFixed(0))
  if (JSBI.equal(scaledMarketPrice, JSBI.BigInt(0))) {
    return undefined
  }

  let scaledPoolPrice: JSBI
  try {
    scaledPoolPrice = JSBI.BigInt(
      poolPrice
        .quote(
          CurrencyAmount.fromRawAmount(
            poolPrice.baseCurrency,
            JSBI.BigInt(parseUnits('1', poolPrice.baseCurrency.decimals).toString()),
          ),
        )
        .multiply(PRICE_DECIMAL_SCALAR)
        .toFixed(0),
    )
  } catch {
    // Degenerate pool prices (e.g. extreme-decimals token near MAX tick) overflow the SDK's amount
    // bounds. A pool price too extreme to even quote is astronomically far from any market price
    // that survived the zero check above, so report it as out of sync — failing open here would
    // hide the warning on exactly the pinned pools this check exists to catch.
    return { isOutOfSync: true, divergencePercent: Infinity }
  }

  const difference = JSBI.lessThan(scaledMarketPrice, scaledPoolPrice)
    ? JSBI.subtract(scaledPoolPrice, scaledMarketPrice)
    : JSBI.subtract(scaledMarketPrice, scaledPoolPrice)

  const divergence = new Fraction(difference, scaledMarketPrice)

  return {
    isOutOfSync: divergence.greaterThan(POOL_OUT_OF_SYNC_THRESHOLD),
    divergencePercent: Number(divergence.multiply(100).toFixed(2)),
  }
}

function decimalScale(decimals: number): JSBI {
  return JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))
}

const Q192 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(192))

/**
 * Decimal-adjusted token1-per-token0 price implied by a pool's sqrtPriceX96, in the same
 * orientation and scale as getMarketPriceFromUsdPrices. Undefined for zero or malformed input.
 */
export function getPriceFromSqrtPriceX96({
  sqrtPriceX96,
  token0Decimals,
  token1Decimals,
}: {
  sqrtPriceX96: string
  token0Decimals: number
  token1Decimals: number
}): Fraction | undefined {
  try {
    const sqrtPrice = JSBI.BigInt(sqrtPriceX96)
    if (JSBI.lessThanOrEqual(sqrtPrice, JSBI.BigInt(0))) {
      return undefined
    }

    return new Fraction(
      JSBI.multiply(JSBI.multiply(sqrtPrice, sqrtPrice), decimalScale(token0Decimals)),
      JSBI.multiply(Q192, decimalScale(token1Decimals)),
    )
  } catch {
    return undefined
  }
}

/** Market exchange rate as an SDK Price in the pool's token0/token1 orientation. */
export function marketPriceToSdkPrice({
  pool,
  marketPrice,
}: {
  pool: V3Pool | V4Pool
  marketPrice: Fraction
}): Price<Currency, Currency> {
  const [base, quote] = pool instanceof V4Pool ? [pool.currency0, pool.currency1] : [pool.token0, pool.token1]
  return new Price(
    base,
    quote,
    JSBI.multiply(marketPrice.denominator, decimalScale(base.decimals)),
    JSBI.multiply(marketPrice.numerator, decimalScale(quote.decimals)),
  )
}

/**
 * Tick implied by the market exchange rate: where the pool's current tick would sit if the pool
 * traded at the market price (quote per base, decimal-adjusted, in token0/token1 orientation).
 * Undefined when the price is outside representable tick bounds.
 */
export function getMarketPriceImpliedTick({
  pool,
  marketPrice,
}: {
  pool: V3Pool | V4Pool
  marketPrice: Fraction
}): number | undefined {
  try {
    const price = marketPriceToSdkPrice({ pool, marketPrice })
    if (pool instanceof V4Pool) {
      return priceToClosestV4Tick(price)
    }

    return priceToClosestV3Tick(price as Price<Token, Token>)
  } catch {
    return undefined
  }
}
