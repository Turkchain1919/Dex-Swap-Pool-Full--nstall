import { describe, expect, it } from 'vitest'
import { getPoolsAprRange } from '~/features/Liquidity/PoolsFilter/aprRange'
import type { PoolStat } from '~/types/explore'

function poolWithApr(apr: number | undefined): PoolStat {
  return { id: String(apr), apr } as unknown as PoolStat
}

describe('getPoolsAprRange', () => {
  it('returns undefined when there are no pools or none has a finite APR', () => {
    expect(getPoolsAprRange(undefined)).toBeUndefined()
    expect(getPoolsAprRange([])).toBeUndefined()
    expect(getPoolsAprRange([poolWithApr(undefined), poolWithApr(Number.NaN)])).toBeUndefined()
  })

  it('returns the smallest and largest APR across the pools, rounded to two decimals', () => {
    expect(getPoolsAprRange([poolWithApr(4.989999), poolWithApr(0.834), poolWithApr(12.5)])).toEqual({
      min: 0.83,
      max: 12.5,
    })
  })

  it('skips pools without a finite APR when computing the bounds', () => {
    expect(getPoolsAprRange([poolWithApr(undefined), poolWithApr(3), poolWithApr(Number.POSITIVE_INFINITY)])).toEqual({
      min: 3,
      max: 3,
    })
  })
})
