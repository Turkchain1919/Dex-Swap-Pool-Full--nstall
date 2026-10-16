import { getChartCurrentPrice } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/selectors/priceSelectors'
import type { ChartStoreState } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/types'

type PriceSlice = Pick<ChartStoreState, 'currentPrice' | 'renderingContext'>

const withChart = (prices: number[]): PriceSlice['renderingContext'] =>
  ({
    priceData: prices.map((value) => ({ value })),
  }) as unknown as PriceSlice['renderingContext']

describe('getChartCurrentPrice', () => {
  it('prefers the store price over the chart price point', () => {
    expect(getChartCurrentPrice({ currentPrice: 42, renderingContext: withChart([10, 20]) })).toBe(42)
  })

  it('falls back to the last chart price point when the store has none', () => {
    expect(getChartCurrentPrice({ currentPrice: undefined, renderingContext: withChart([10, 20]) })).toBe(20)
  })

  it('falls back when the store price is NaN rather than letting it shadow the chart', () => {
    // The parent passes Number(price?.toSignificant()), which is NaN while the price is unset.
    // NaN is not nullish, so `??` would return NaN here and read falsy downstream.
    expect(getChartCurrentPrice({ currentPrice: NaN, renderingContext: withChart([10, 20]) })).toBe(20)
  })

  it('returns undefined when neither source has a usable price', () => {
    expect(getChartCurrentPrice({ currentPrice: NaN, renderingContext: null })).toBeUndefined()
    expect(getChartCurrentPrice({ currentPrice: undefined, renderingContext: null })).toBeUndefined()
  })

  // Resolution only — a zero price reaches the consumers, which each reject it on their own
  // (`viewSelectors` blanks the deltas, `percentageToPrice` skips the percent branch). A zero pool
  // price is degenerate, so this documents where the guarantee stops, not an end-to-end promise.
  it('resolves a zero store price rather than silently falling back to the chart', () => {
    expect(getChartCurrentPrice({ currentPrice: 0, renderingContext: withChart([10]) })).toBe(0)
  })
})
