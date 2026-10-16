import { nearestUsableTick, TickMath } from '@uniswap/v3-sdk'
import { clampMaxTick, clampMinTick } from '~/features/Liquidity/utils/clampTickRange'

const TICK_SPACING = 60
const USABLE_MIN = nearestUsableTick(TickMath.MIN_TICK, TICK_SPACING)
const USABLE_MAX = nearestUsableTick(TickMath.MAX_TICK, TICK_SPACING)

describe('clampMinTick', () => {
  it('passes an ordered min through untouched', () => {
    expect(clampMinTick({ tick: -120, maxTick: 120, tickSpacing: TICK_SPACING })).toBe(-120)
  })

  it('steps one spacing below the held max when the incoming min reaches it', () => {
    expect(clampMinTick({ tick: 180, maxTick: 120, tickSpacing: TICK_SPACING })).toBe(60)
  })

  it('does not step below the usable tick range at the bottom edge', () => {
    expect(clampMinTick({ tick: 0, maxTick: USABLE_MIN, tickSpacing: TICK_SPACING })).toBe(USABLE_MIN)
  })

  it('leaves an undefined min alone', () => {
    expect(clampMinTick({ tick: undefined, maxTick: 120, tickSpacing: TICK_SPACING })).toBeUndefined()
  })
})

describe('clampMaxTick', () => {
  it('passes an ordered max through untouched', () => {
    expect(clampMaxTick({ tick: 120, minTick: -120, tickSpacing: TICK_SPACING })).toBe(120)
  })

  it('steps one spacing above the held min when the incoming max reaches it', () => {
    expect(clampMaxTick({ tick: -180, minTick: -120, tickSpacing: TICK_SPACING })).toBe(-60)
  })

  it('does not step above the usable tick range at the top edge', () => {
    expect(clampMaxTick({ tick: 0, minTick: USABLE_MAX, tickSpacing: TICK_SPACING })).toBe(USABLE_MAX)
  })

  it('leaves an undefined max alone', () => {
    expect(clampMaxTick({ tick: undefined, minTick: -120, tickSpacing: TICK_SPACING })).toBeUndefined()
  })
})
