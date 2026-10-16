import { Percent } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { useMemo } from 'react'
import { PositionInfo } from 'uniswap/src/features/positions/types'

const ZERO = JSBI.BigInt(0)

export function useGetPoolTokenPercentage(positionInfo?: PositionInfo) {
  const { totalSupply, liquidityAmount } = positionInfo ?? {}

  const poolTokenPercentage = useMemo(() => {
    // A zero total supply also satisfies the >= check (liquidity is then 0 too), and the resulting
    // `new Percent(0, 0)` throws "[big.js] Division by zero" on the first toFixed() in a consumer.
    return !!liquidityAmount &&
      !!totalSupply &&
      JSBI.greaterThan(totalSupply.quotient, ZERO) &&
      JSBI.greaterThanOrEqual(totalSupply.quotient, liquidityAmount.quotient)
      ? new Percent(liquidityAmount.quotient, totalSupply.quotient)
      : undefined
  }, [liquidityAmount, totalSupply])

  return poolTokenPercentage
}
