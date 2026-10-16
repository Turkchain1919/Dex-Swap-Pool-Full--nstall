import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Currency } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { useMemo } from 'react'
import { TickProcessed } from '~/features/Liquidity/utils/computeSurroundingTicks'
import {
  buildV2SyntheticPool,
  buildV2SyntheticTicksProcessed,
  V2Reserves,
  V2SyntheticPool,
} from '~/features/Liquidity/utils/v2SyntheticTicks'
import { PositionField } from '~/types/position'

/**
 * A v2 pair initializes no ticks, so neither tick source has anything to return for it. The
 * equivalent distribution is derivable from the reserves alone — see `buildV2SyntheticPool`.
 *
 * Both `useAllPoolTicks` and `usePoolActiveLiquidity` need this pool, and they must agree on it:
 * one reads `rawTicks` off it while the other reads the tick/liquidity/price fields, and a chart
 * fed halves derived from two differently-parameterized pools would be silently inconsistent.
 */
export function useV2SyntheticPool({
  version,
  sdkCurrencies,
  v2Reserves,
  tickSpacing,
}: {
  version: ProtocolVersion
  sdkCurrencies: { [field in PositionField]: Maybe<Currency> }
  v2Reserves?: V2Reserves
  tickSpacing?: number
}): V2SyntheticPool | undefined {
  return useMemo(() => {
    const { TOKEN0, TOKEN1 } = sdkCurrencies
    if (version !== ProtocolVersion.V2 || !TOKEN0 || !TOKEN1) {
      return undefined
    }
    return buildV2SyntheticPool({ reserves: v2Reserves, token0: TOKEN0, token1: TOKEN1, tickSpacing })
  }, [version, sdkCurrencies, v2Reserves, tickSpacing])
}

export interface V2SyntheticActiveLiquidity {
  isLoading: boolean
  error: undefined
  currentTick?: number
  activeTick?: number
  liquidity?: JSBI
  sqrtPriceX96?: JSBI
  tickSpacing?: number
  data?: TickProcessed[]
}

/**
 * The v2 half of `usePoolActiveLiquidity`, resolved entirely from the pair's reserves.
 *
 * Deliberately separate from the V3/V4 path rather than widening `poolEnabledProtocolVersion`: that
 * predicate reaches well beyond charts, so v2 short-circuits ahead of it and the pool read,
 * `activeTick` and the `computeSurroundingTicks` walk all stay V3/V4-only. Returns undefined for
 * non-v2 so the caller can fall through.
 */
export function useV2SyntheticActiveLiquidity({
  version,
  sdkCurrencies,
  syntheticPool,
}: {
  version: ProtocolVersion
  sdkCurrencies: { [field in PositionField]: Maybe<Currency> }
  syntheticPool: V2SyntheticPool | undefined
}): V2SyntheticActiveLiquidity | undefined {
  return useMemo(() => {
    const token0 = sdkCurrencies.TOKEN0
    const token1 = sdkCurrencies.TOKEN1
    if (version !== ProtocolVersion.V2 || !token0 || !token1) {
      return undefined
    }

    // Unbuildable reserves (missing, zero, or a ratio outside the tick range) fail closed to no
    // chart rather than a wrong one — `buildV2SyntheticPool` documents each precondition.
    if (!syntheticPool) {
      return { isLoading: false, error: undefined, data: undefined }
    }

    return {
      isLoading: false,
      error: undefined,
      currentTick: syntheticPool.currentTick,
      activeTick: syntheticPool.activeTick,
      liquidity: syntheticPool.liquidity,
      sqrtPriceX96: syntheticPool.sqrtPriceX96,
      tickSpacing: syntheticPool.tickSpacing,
      data: buildV2SyntheticTicksProcessed({ pool: syntheticPool, token0, token1 }),
    }
  }, [version, sdkCurrencies, syntheticPool])
}
