import { Pair } from '@uniswap/v2-sdk'
import { Pool as V3Pool } from '@uniswap/v3-sdk'
import { Pool as V4Pool } from '@uniswap/v4-sdk'
import JSBI from 'jsbi'

/**
 * A concentrated-liquidity pool with zero in-range liquidity cannot be arbitraged back to the
 * market price, so its slot0 price may be permanently stale. V2 pairs always trade on reserves,
 * so this never applies to them.
 */
export function hasZeroInRangeLiquidity(poolOrPair: V4Pool | V3Pool | Pair | undefined): boolean {
  if (!poolOrPair || poolOrPair instanceof Pair) {
    return false
  }

  return JSBI.equal(poolOrPair.liquidity, JSBI.BigInt(0))
}
