import { toDisplayCurrentPrice } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/utils/toDisplayCurrentPrice'

describe('toDisplayCurrentPrice', () => {
  it('inverts the canonical initial price to display orientation for a new inverted pool', () => {
    // Repro: getInitialPrice returns canonical ~2454.51 USDT/ETH; the chart series is inverted
    // (~0.0004 ETH/USDT), so the appended point must be inverted to match or it collapses the range.
    expect(toDisplayCurrentPrice({ currentPrice: 2454.51, priceInverted: true, creatingPoolOrPair: true })).toBeCloseTo(
      0.0004074,
      6,
    )
  })

  it('leaves a new pool untouched when not inverted (canonical already equals display)', () => {
    expect(toDisplayCurrentPrice({ currentPrice: 2454.51, priceInverted: false, creatingPoolOrPair: true })).toBe(
      2454.51,
    )
  })

  it('leaves an existing pool untouched — getPrice already returns a display-oriented price', () => {
    expect(toDisplayCurrentPrice({ currentPrice: 0.0004074, priceInverted: true, creatingPoolOrPair: false })).toBe(
      0.0004074,
    )
  })

  it('passes through undefined / zero unchanged', () => {
    expect(
      toDisplayCurrentPrice({ currentPrice: undefined, priceInverted: true, creatingPoolOrPair: true }),
    ).toBeUndefined()
    expect(toDisplayCurrentPrice({ currentPrice: 0, priceInverted: true, creatingPoolOrPair: true })).toBe(0)
  })
})
