import { calculateDefaultPriceRange } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/utils/defaultPriceRange'

describe('calculateDefaultPriceRange', () => {
  it('keeps the lower bound positive for a volatile pair whose historical high dwarfs the current price (LP-1674)', () => {
    // Repro shape: current price 100, but the pair once traded up to 1000 (10x). In linear price
    // space the lower bound was currentPrice - spread = 100 - 900 = -800, floored to 0 -> MIN_TICK,
    // which produced a one-sided "100% single token" default range.
    const result = calculateDefaultPriceRange({ priceDataMin: 50, priceDataMax: 1000, currentPrice: 100 })

    expect(result).toBeDefined()
    expect(result!.minPrice).toBeGreaterThan(0)
    expect(result!.minPrice).toBeLessThan(100)
    expect(result!.maxPrice).toBeGreaterThan(100)
  })

  it('centers the range symmetrically in ratio space around the current price', () => {
    // In log space min and max are equidistant from the current price, so minPrice * maxPrice
    // equals currentPrice^2 and the up/down ratios match.
    const currentPrice = 100
    const result = calculateDefaultPriceRange({ priceDataMin: 50, priceDataMax: 1000, currentPrice })

    expect(result!.minPrice * result!.maxPrice).toBeCloseTo(currentPrice * currentPrice, 4)
    expect(result!.maxPrice / currentPrice).toBeCloseTo(currentPrice / result!.minPrice, 6)
  })

  it('handles a historical low far below the current price', () => {
    const result = calculateDefaultPriceRange({ priceDataMin: 1, priceDataMax: 120, currentPrice: 100 })

    expect(result!.minPrice).toBeGreaterThan(0)
    expect(result!.minPrice).toBeLessThan(100)
    expect(result!.maxPrice).toBeGreaterThan(100)
  })

  it('produces a tight range for a stablecoin pair', () => {
    const result = calculateDefaultPriceRange({ priceDataMin: 0.98, priceDataMax: 1.02, currentPrice: 1 })

    expect(result!.minPrice).toBeCloseTo(0.988, 3)
    expect(result!.maxPrice).toBeCloseTo(1.012, 3)
  })

  it('returns a degenerate range when the price history is flat', () => {
    // No spread -> both bounds collapse to the current price, letting the caller fall back to the
    // stable strategy (defaultMinTick === defaultMaxTick).
    const result = calculateDefaultPriceRange({ priceDataMin: 100, priceDataMax: 100, currentPrice: 100 })

    expect(result!.minPrice).toBeCloseTo(100, 6)
    expect(result!.maxPrice).toBeCloseTo(100, 6)
  })

  it('returns undefined when any price is non-positive (e.g. empty price history)', () => {
    expect(calculateDefaultPriceRange({ priceDataMin: 0, priceDataMax: 0, currentPrice: 0 })).toBeUndefined()
    expect(calculateDefaultPriceRange({ priceDataMin: 50, priceDataMax: 1000, currentPrice: 0 })).toBeUndefined()
    expect(calculateDefaultPriceRange({ priceDataMin: -1, priceDataMax: 1000, currentPrice: 100 })).toBeUndefined()
  })
})
