import { nearestUsableTick, TickMath } from '@uniswap/v3-sdk'
import { DefaultPriceStrategy } from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/types'
import {
  calculateStrategyTicks,
  detectTickStrategy,
} from '~/features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart/utils/priceStrategies'

const TICK_SPACING = 60
const HALF_PRICE_TICK_DELTA = Math.round(Math.log(0.5) / Math.log(1.0001))
const DOUBLE_PRICE_TICK_DELTA = Math.round(Math.log(2) / Math.log(1.0001))

describe('calculateStrategyTicks', () => {
  it('STABLE spans ±3 buckets around the floored current bucket', () => {
    const currentTick = 100 // floors to 60 with spacing 60
    const { minTick, maxTick } = calculateStrategyTicks({
      priceStrategy: DefaultPriceStrategy.STABLE,
      currentTick,
      tickSpacing: TICK_SPACING,
    })
    expect(minTick).toBe(60 - 3 * TICK_SPACING)
    expect(maxTick).toBe(60 + 3 * TICK_SPACING)
  })

  it('WIDE spans -50% to +100% snapped to spacing', () => {
    const currentTick = 0
    const { minTick, maxTick } = calculateStrategyTicks({
      priceStrategy: DefaultPriceStrategy.WIDE,
      currentTick,
      tickSpacing: TICK_SPACING,
    })
    expect(minTick).toBe(Math.round(HALF_PRICE_TICK_DELTA / TICK_SPACING) * TICK_SPACING)
    expect(maxTick).toBe(Math.round(DOUBLE_PRICE_TICK_DELTA / TICK_SPACING) * TICK_SPACING)
  })

  it('one-sided strategies hug the current tick on the closed side', () => {
    const currentTick = 0
    const upper = calculateStrategyTicks({
      priceStrategy: DefaultPriceStrategy.ONE_SIDED_UPPER,
      currentTick,
      tickSpacing: TICK_SPACING,
    })
    expect(upper.minTick).toBe(TICK_SPACING)
    const lower = calculateStrategyTicks({
      priceStrategy: DefaultPriceStrategy.ONE_SIDED_LOWER,
      currentTick,
      tickSpacing: TICK_SPACING,
    })
    expect(lower.maxTick).toBe(-TICK_SPACING)
  })

  it('clamps to usable tick bounds near the edges of the tick range', () => {
    const usableMinTick = nearestUsableTick(TickMath.MIN_TICK, TICK_SPACING)
    const { minTick } = calculateStrategyTicks({
      priceStrategy: DefaultPriceStrategy.WIDE,
      currentTick: usableMinTick + TICK_SPACING,
      tickSpacing: TICK_SPACING,
    })
    expect(minTick).toBe(usableMinTick)
  })

  // A pool can be initialized at an extreme tick and never traded away from it. Its presets have to
  // still produce an ordered range: `clampMaxTick` only pushes max up, and at the top edge max is
  // already at the ceiling, so nothing downstream can repair an inverted one.
  it.each([TickMath.MIN_TICK, TickMath.MAX_TICK, 0])(
    'keeps every strategy ordered for a pool sitting at tick %i',
    (currentTick) => {
      const usableMinTick = nearestUsableTick(TickMath.MIN_TICK, TICK_SPACING)
      const usableMaxTick = nearestUsableTick(TickMath.MAX_TICK, TICK_SPACING)

      // Collected rather than asserted one at a time so a failure names the offending strategy.
      const violations = [
        DefaultPriceStrategy.STABLE,
        DefaultPriceStrategy.WIDE,
        DefaultPriceStrategy.ONE_SIDED_LOWER,
        DefaultPriceStrategy.ONE_SIDED_UPPER,
        DefaultPriceStrategy.FULL_RANGE,
      ].filter((priceStrategy) => {
        const { minTick, maxTick } = calculateStrategyTicks({ priceStrategy, currentTick, tickSpacing: TICK_SPACING })
        return !(minTick < maxTick && minTick >= usableMinTick && maxTick <= usableMaxTick)
      })

      expect(violations).toEqual([])
    },
  )
})

describe('detectTickStrategy', () => {
  it('returns undefined when either tick is unset', () => {
    expect(detectTickStrategy({ minTick: undefined, maxTick: 60, currentTick: 0, tickSpacing: TICK_SPACING })).toBe(
      undefined,
    )
  })

  it('round-trips every current-tick-anchored strategy', () => {
    const currentTick = 100
    const strategies = [
      DefaultPriceStrategy.STABLE,
      DefaultPriceStrategy.WIDE,
      DefaultPriceStrategy.ONE_SIDED_LOWER,
      DefaultPriceStrategy.ONE_SIDED_UPPER,
    ]
    for (const priceStrategy of strategies) {
      const { minTick, maxTick } = calculateStrategyTicks({ priceStrategy, currentTick, tickSpacing: TICK_SPACING })
      expect(detectTickStrategy({ minTick, maxTick, currentTick, tickSpacing: TICK_SPACING })).toBe(priceStrategy)
    }
  })

  it('drops the match when the current tick moves away (new-pool initial price edit)', () => {
    const { minTick, maxTick } = calculateStrategyTicks({
      priceStrategy: DefaultPriceStrategy.STABLE,
      currentTick: 0,
      tickSpacing: TICK_SPACING,
    })
    const movedTick = 0 + 20 * TICK_SPACING
    expect(detectTickStrategy({ minTick, maxTick, currentTick: movedTick, tickSpacing: TICK_SPACING })).toBe(undefined)
  })
})
