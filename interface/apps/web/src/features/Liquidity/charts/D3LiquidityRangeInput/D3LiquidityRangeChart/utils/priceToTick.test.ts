import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Token } from '@uniswap/sdk-core'
import { TickMath } from '@uniswap/v3-sdk'
import { priceToTick } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/utils/priceToTick'
import { getDisplayPriceFromTick } from '~/features/Liquidity/utils/getTickToPrice'

// Sorted so USDC is token0: a 6/18 decimal split, the case a bare log(price) gets wrong.
const USDC = new Token(1, '0x0000000000000000000000000000000000000001', 6, 'USDC')
const WETH = new Token(1, '0x0000000000000000000000000000000000000002', 18, 'WETH')

function displayPrice({ tick, priceInverted }: { tick: number; priceInverted: boolean }): number {
  const [baseCurrency, quoteCurrency] = priceInverted ? [WETH, USDC] : [USDC, WETH]
  const price = getDisplayPriceFromTick({
    tick,
    baseCurrency,
    quoteCurrency,
    priceInverted,
    protocolVersion: ProtocolVersion.V4,
  })
  if (price === undefined) {
    throw new Error('expected a price')
  }
  return price
}

describe('priceToTick', () => {
  it('inverts getDisplayPriceFromTick across a decimals mismatch', () => {
    // 8 significant digits of price resolve to well under a hundredth of a tick.
    for (const tick of [-276_320, -200_000, 0, 60, 195_000]) {
      const price = displayPrice({ tick, priceInverted: false })
      expect(priceToTick({ price, baseCurrency: USDC, quoteCurrency: WETH })).toBeCloseTo(tick, 2)
    }
  })

  it('inverts getDisplayPriceFromTick in visual tick space when the price is inverted', () => {
    // The visual base/quote are swapped and the display tick is the negated canonical tick; passing
    // the swapped currencies must land on the same visual tick the chart would draw.
    for (const visualTick of [276_320, 12_345, -60]) {
      const price = displayPrice({ tick: visualTick, priceInverted: true })
      expect(priceToTick({ price, baseCurrency: WETH, quoteCurrency: USDC })).toBeCloseTo(visualTick, 2)
    }
  })

  it('clamps to the valid tick range', () => {
    expect(priceToTick({ price: 0, baseCurrency: USDC, quoteCurrency: WETH })).toBe(TickMath.MIN_TICK)
    expect(priceToTick({ price: -1, baseCurrency: USDC, quoteCurrency: WETH })).toBe(TickMath.MIN_TICK)
    expect(priceToTick({ price: 1e300, baseCurrency: USDC, quoteCurrency: WETH })).toBe(TickMath.MAX_TICK)
    // Reachable by typing e.g. 1e999 into the max-price input, which parses to +Infinity
    expect(priceToTick({ price: Number.POSITIVE_INFINITY, baseCurrency: USDC, quoteCurrency: WETH })).toBe(
      TickMath.MAX_TICK,
    )
  })

  it('treats missing currencies as equal decimals', () => {
    expect(priceToTick({ price: 1, baseCurrency: undefined, quoteCurrency: undefined })).toBeCloseTo(0, 6)
  })
})
