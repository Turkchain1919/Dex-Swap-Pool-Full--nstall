import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Currency, Token, V3_CORE_FACTORY_ADDRESSES } from '@uniswap/sdk-core'
import { FeeAmount, TICK_SPACINGS, tickToPrice as tickToPriceV3, Pool as V3Pool } from '@uniswap/v3-sdk'
import { tickToPrice as tickToPriceV4, Pool as V4Pool } from '@uniswap/v4-sdk'
import { UniverseChainId } from '@universe/chains'
import JSBI from 'jsbi'
import { useMemo } from 'react'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { getWrappedTokenIfExists } from 'uniswap/src/utils/currency'
import { logger } from 'utilities/src/logger/logger'
import { useLiquidityServiceGetPool } from '~/features/Liquidity/hooks/useLiquidityServiceGetPool'
import { useLiquidityServicePoolTicks } from '~/features/Liquidity/hooks/useLiquidityServicePoolTicks'
import { useV2SyntheticActiveLiquidity, useV2SyntheticPool } from '~/features/Liquidity/hooks/useV2SyntheticPool'
import { TickData } from '~/features/Liquidity/types/ticks'
import { computeSurroundingTicks, TickProcessed } from '~/features/Liquidity/utils/computeSurroundingTicks'
import { normalizePoolSummary } from '~/features/Liquidity/utils/normalizePoolSummary'
import { poolEnabledProtocolVersion } from '~/features/Liquidity/utils/protocolVersion'
import { V2Reserves } from '~/features/Liquidity/utils/v2SyntheticTicks'
import { useMultichainContext } from '~/state/multichain/useMultichainContext'
import { PositionField } from '~/types/position'

const PRICE_FIXED_DIGITS = 8

// `Pool.tick_spacing` is a non-optional proto3 scalar, so an absent value arrives as 0.
export function normalizeTickSpacing(tickSpacing?: number): number | undefined {
  return tickSpacing ? tickSpacing : undefined
}

function getActiveTick({
  tickCurrent,
  feeAmount,
  tickSpacing,
}: {
  tickCurrent?: number
  feeAmount?: FeeAmount
  tickSpacing?: number
}): number | undefined {
  return tickCurrent !== undefined && feeAmount !== undefined && tickSpacing
    ? Math.floor(tickCurrent / tickSpacing) * tickSpacing
    : undefined
}

/** Derives the SDK pool id (v3 pool address / v4 pool id hash) for a pair + fee (+ tickSpacing + hooks on v4). */
function computePoolId({
  sdkCurrencies,
  feeAmount,
  tickSpacing,
  hooks,
  version,
  chainId,
}: {
  sdkCurrencies: { [field in PositionField]: Maybe<Currency> }
  feeAmount?: FeeAmount
  tickSpacing?: number
  hooks?: string
  version: ProtocolVersion
  chainId: UniverseChainId
}): string | undefined {
  const { TOKEN0, TOKEN1 } = sdkCurrencies
  const wrappedToken0 = getWrappedTokenIfExists(TOKEN0)
  const wrappedToken1 = getWrappedTokenIfExists(TOKEN1)
  const v3PoolAddress =
    wrappedToken0 && wrappedToken1 && feeAmount && version === ProtocolVersion.V3
      ? V3Pool.getAddress(wrappedToken0, wrappedToken1, feeAmount, undefined, V3_CORE_FACTORY_ADDRESSES[chainId])
      : undefined

  const v4PoolId =
    version === ProtocolVersion.V4 && TOKEN0 && TOKEN1 && feeAmount && tickSpacing && hooks
      ? V4Pool.getPoolId(TOKEN0, TOKEN1, feeAmount, tickSpacing, hooks)
      : undefined
  return version === ProtocolVersion.V3 ? v3PoolAddress : v4PoolId
}

// Fetches all ticks for a given pool
export function useAllPoolTicks({
  sdkCurrencies,
  feeAmount,
  chainId,
  version,
  tickSpacing,
  hooks,
  precalculatedPoolId,
  v2Reserves,
  skip,
}: {
  sdkCurrencies: { [field in PositionField]: Maybe<Currency> }
  feeAmount?: FeeAmount
  chainId: UniverseChainId
  version: ProtocolVersion
  tickSpacing?: number
  hooks?: string
  precalculatedPoolId?: string
  /** v2 only: reserves to synthesize a full-range distribution from. See `buildV2SyntheticPool`. */
  v2Reserves?: V2Reserves
  /** Leaves the ticks unfetched, e.g. for a pool that doesn't exist yet. */
  skip?: boolean
}): {
  isLoading: boolean
  error: unknown
  ticks?: TickData[]
} {
  const poolId = useMemo(
    () => precalculatedPoolId ?? computePoolId({ sdkCurrencies, feeAmount, tickSpacing, hooks, version, chainId }),
    [chainId, sdkCurrencies, feeAmount, hooks, precalculatedPoolId, tickSpacing, version],
  )

  // The liquidity-service GetPoolTicks endpoint returns the full V3/V4 distribution in one RPC.
  const liquidityServiceResult = useLiquidityServicePoolTicks({ poolId, version, chainId, disabled: skip })

  // v2 has no real ticks; synthesize a full-range distribution from the pair's reserves instead.
  const v2SyntheticTicks = useV2SyntheticPool({ version, sdkCurrencies, v2Reserves, tickSpacing })?.rawTicks

  if (version === ProtocolVersion.V2) {
    return { isLoading: false, error: undefined, ticks: v2SyntheticTicks }
  }

  return liquidityServiceResult
}

export function usePoolActiveLiquidity({
  sdkCurrencies,
  feeAmount,
  chainId,
  version,
  tickSpacing,
  hooks,
  poolId,
  skip,
  v2Reserves,
}: {
  poolId?: string
  sdkCurrencies: { [field in PositionField]: Maybe<Currency> }
  feeAmount?: number
  version: ProtocolVersion
  chainId?: UniverseChainId
  tickSpacing?: number
  hooks?: string
  skip?: boolean
  /** v2 only: reserves to synthesize a full-range distribution from. See `buildV2SyntheticPool`. */
  v2Reserves?: V2Reserves
}): {
  isLoading: boolean
  error: any
  currentTick?: number
  activeTick?: number
  liquidity?: JSBI
  sqrtPriceX96?: JSBI
  tickSpacing?: number
  data?: TickProcessed[]
} {
  const multichainContext = useMultichainContext()
  const defaultChainId = multichainContext.chainId ?? UniverseChainId.Mainnet
  const poolsQueryEnabled = Boolean(
    poolEnabledProtocolVersion(version) && sdkCurrencies.TOKEN0 && sdkCurrencies.TOKEN1 && !skip,
  )

  // GetPool is keyed by pool id; derive it like useAllPoolTicks does (caller-provided id wins).
  // v4 hookless derivation uses the zero address, matching the v1 request's `hooks ?? ZERO_ADDRESS`.
  // Backfill tickSpacing from the fee tier so a v4 lookup with hooks + fee but no caller-supplied
  // tickSpacing (the create flow) still derives an id — useAllPoolTicks backfills the same way via
  // tickSpacingWithFallback below, so without this the ticks resolve while pool never does.
  const resolvedPoolId = useMemo(
    () =>
      poolId ??
      computePoolId({
        sdkCurrencies,
        feeAmount,
        // Fee-tier backfill is V3/V4-only, matching tickSpacingWithFallback: v2's 0.30% fee would
        // resolve TICK_SPACINGS[3000] = 60 and pin this path to it, while the charts follow the
        // V2_SYNTHETIC_TICK_SPACING default. Both are 60 today, so they would agree by coincidence.
        tickSpacing:
          normalizeTickSpacing(tickSpacing) ??
          (feeAmount && version !== ProtocolVersion.V2 ? TICK_SPACINGS[feeAmount as FeeAmount] : undefined),
        hooks: hooks ?? ZERO_ADDRESS,
        version,
        chainId: chainId ?? defaultChainId,
      }),
    [poolId, sdkCurrencies, feeAmount, tickSpacing, hooks, version, chainId, defaultChainId],
  )

  const { data: v2PoolData, isLoading: isV2PoolLoading } = useLiquidityServiceGetPool({
    chainId: chainId ?? defaultChainId,
    poolId: resolvedPoolId,
    enabled: poolsQueryEnabled,
  })

  // The liquidity-service GetPool response, normalized to the canonical v2 Pool shape.
  const pool = useMemo(() => (v2PoolData?.pool ? normalizePoolSummary(v2PoolData.pool) : undefined), [v2PoolData])

  // The fee-tier fallback is a V3/V4 notion and must not apply to v2: v2's fixed 0.30% fee would
  // resolve TICK_SPACINGS[3000] = 60 and get passed down explicitly, overriding the
  // V2_SYNTHETIC_TICK_SPACING default. That happens to be 60 too, so the two agree today by
  // coincidence — but it would leave this path (and the Depth chart) pinned at 60 while
  // D3LiquidityPoolChart, which builds its pool without a tickSpacing, followed the constant.
  // Leaving it undefined for v2 lets the single default in `buildV2SyntheticPool` govern both.
  const tickSpacingWithFallback =
    normalizeTickSpacing(tickSpacing) ??
    normalizeTickSpacing(pool?.tickSpacing) ??
    (feeAmount && version !== ProtocolVersion.V2 ? TICK_SPACINGS[feeAmount as FeeAmount] : undefined)

  const liquidity = pool?.liquidity
  const sqrtPriceX96 = pool?.sqrtPriceX96

  const currentTick = pool?.currentTick
  // Find nearest valid tick for pool in case tick is not initialized.
  const activeTick = useMemo(
    () =>
      getActiveTick({
        tickCurrent: currentTick,
        feeAmount,
        tickSpacing: tickSpacingWithFallback,
      }),
    [currentTick, feeAmount, tickSpacingWithFallback],
  )

  // useAllPoolTicks keys its GetPoolTicks read off this id: the caller-provided poolId wins,
  // otherwise the derived resolvedPoolId (which the create flow, lacking a poolId, relies on).
  const { isLoading, error, ticks } = useAllPoolTicks({
    sdkCurrencies,
    feeAmount,
    precalculatedPoolId: poolId ?? resolvedPoolId,
    chainId: chainId ?? defaultChainId,
    version,
    tickSpacing: tickSpacingWithFallback,
    hooks,
    v2Reserves,
    skip,
  })

  // Same inputs as the build inside `useAllPoolTicks` above, so both halves describe one pool.
  const syntheticPool = useV2SyntheticPool({
    version,
    sdkCurrencies,
    v2Reserves,
    tickSpacing: tickSpacingWithFallback,
  })

  const v2SyntheticResult = useV2SyntheticActiveLiquidity({ version, sdkCurrencies, syntheticPool })

  const v3v4Result = useMemo(() => {
    const token0 = sdkCurrencies.TOKEN0
    const token1 = sdkCurrencies.TOKEN1

    if (!token0 || !token1 || activeTick === undefined || !pool || !ticks || ticks.length === 0 || isLoading) {
      return {
        isLoading: isLoading || isV2PoolLoading,
        error,
        activeTick,
        tickSpacing: tickSpacingWithFallback,
        data: undefined,
      }
    }

    // find where the active tick would be to partition the array
    // if the active tick is initialized, the pivot will be an element
    // if not, take the previous tick as pivot
    const pivot = ticks.findIndex((tickData) => tickData.tick && tickData.tick > activeTick) - 1

    if (pivot < 0) {
      // consider setting a local error
      logger.debug('usePoolTickData', 'usePoolActiveLiquidity', 'TickData pivot not found', {
        token0: token0.isToken ? token0.address : ZERO_ADDRESS,
        token1: token1.isToken ? token1.address : ZERO_ADDRESS,
        chainId: token0.chainId,
      })
      return {
        isLoading,
        error,
        activeTick,
        tickSpacing: tickSpacingWithFallback,
        data: undefined,
      }
    }

    let sdkPrice
    try {
      sdkPrice =
        version === ProtocolVersion.V3
          ? tickToPriceV3(token0 as Token, token1 as Token, activeTick)
          : tickToPriceV4(token0, token1, activeTick)
    } catch (e) {
      logger.debug('usePoolTickData', 'usePoolActiveLiquidity', 'Error getting price', {
        error: e,
        token0: token0.isToken ? token0.address : ZERO_ADDRESS,
        token1: token1.isToken ? token1.address : ZERO_ADDRESS,
        chainId: token0.chainId,
      })

      return {
        isLoading,
        error,
        activeTick,
        tickSpacing: tickSpacingWithFallback,
        data: undefined,
      }
    }

    const activeTickProcessed: TickProcessed = {
      liquidityActive: JSBI.BigInt(pool.liquidity.toString()),
      tick: activeTick,
      liquidityNet: JSBI.BigInt(ticks[pivot]?.liquidityNet ?? 0),
      price0: sdkPrice.toFixed(PRICE_FIXED_DIGITS),
      sdkPrice,
    }

    const subsequentTicks = computeSurroundingTicks({
      token0,
      token1,
      activeTickProcessed,
      sortedTickData: ticks,
      pivot,
      ascending: true,
      version,
    })

    const previousTicks = computeSurroundingTicks({
      token0,
      token1,
      activeTickProcessed,
      sortedTickData: ticks,
      pivot,
      ascending: false,
      version,
    })

    const ticksProcessed = previousTicks.concat(activeTickProcessed).concat(subsequentTicks)

    return {
      isLoading,
      error,
      currentTick,
      activeTick,
      liquidity: JSBI.BigInt((liquidity ?? 0n).toString()),
      sqrtPriceX96: JSBI.BigInt(sqrtPriceX96 ?? 0),
      tickSpacing: tickSpacingWithFallback,
      data: ticksProcessed,
    }
  }, [
    sdkCurrencies,
    activeTick,
    pool,
    ticks,
    isLoading,
    version,
    error,
    currentTick,
    liquidity,
    sqrtPriceX96,
    tickSpacingWithFallback,
    isV2PoolLoading,
  ])

  return v2SyntheticResult ?? v3v4Result
}
