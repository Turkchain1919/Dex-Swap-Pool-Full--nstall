import { Currency, CurrencyAmount, Fraction } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import { Pool as V3Pool } from '@uniswap/v3-sdk'
import { Pool as V4Pool } from '@uniswap/v4-sdk'
import JSBI from 'jsbi'
import {
  getMarketPriceFromUsdPrices,
  getPoolPriceDivergence,
  scaleUsdUnitValue,
} from 'uniswap/src/features/positions/poolPriceDivergence'
import { useUSDCValue } from 'uniswap/src/features/transactions/hooks/useUSDCPrice'
import { parseUnits } from '~/chains'

function useMarketPrice(baseCurrency?: Currency, quoteCurrency?: Currency): Fraction | undefined {
  const baseCurrencyUSDPrice = useUSDCValue(
    baseCurrency
      ? CurrencyAmount.fromRawAmount(baseCurrency, JSBI.BigInt(parseUnits('1', baseCurrency.decimals).toString()))
      : undefined,
  )

  const quoteCurrencyUSDPrice = useUSDCValue(
    quoteCurrency
      ? CurrencyAmount.fromRawAmount(quoteCurrency, JSBI.BigInt(parseUnits('1', quoteCurrency.decimals).toString()))
      : undefined,
  )

  return getMarketPriceFromUsdPrices({
    baseUsdScaled: baseCurrencyUSDPrice ? scaleUsdUnitValue(baseCurrencyUSDPrice) : undefined,
    quoteUsdScaled: quoteCurrencyUSDPrice ? scaleUsdUnitValue(quoteCurrencyUSDPrice) : undefined,
  })
}

/**
 * In Uniswap v3, the current price is quoted as the exchange from token0 to token1. However, depending
 * on liquidity conditions, the price in a particular pool can diverge from the rest of the market (i.e. other pools).
 * This hook computes the market exchange rate between two currencies and compares it to the given pool price
 * using the shared divergence check (POOL_OUT_OF_SYNC_THRESHOLD in poolPriceDivergence.ts).
 * Returns false when no market price is available to compare against.
 * @param poolOrPair The pool or pair to check (V4Pool, V3Pool, or V2 Pair)
 * @returns true if the pool price differs significantly from the market price, false otherwise
 */
export function useIsPoolOutOfSync(poolOrPair?: V4Pool | V3Pool | Pair): boolean {
  let poolPrice
  try {
    poolPrice = poolOrPair?.token0Price
  } catch {
    // for a v2 pool if it has been created but there is no liquidity then getting the price will throw an error
    poolPrice = undefined
  }

  const marketPrice = useMarketPrice(poolPrice?.baseCurrency, poolPrice?.quoteCurrency)

  if (!poolPrice || !marketPrice) {
    return false
  }

  return getPoolPriceDivergence({ poolPrice, marketPrice })?.isOutOfSync ?? false
}
