import { Currency, sqrt } from '@uniswap/sdk-core'
import { nearestUsableTick, TickMath } from '@uniswap/v3-sdk'
import { tickToPrice as tickToPriceV4 } from '@uniswap/v4-sdk'
import JSBI from 'jsbi'
import { TickData } from '~/features/Liquidity/types/ticks'
import { TickProcessed } from '~/features/Liquidity/utils/computeSurroundingTicks'

const PRICE_FIXED_DIGITS = 8
const ZERO = JSBI.BigInt(0)
const Q192 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(192))

/**
 * A v2 pair has no tick spacing on chain, but the whole chart stack keys off one: it drives the
 * x-scale, bucket alignment, zoom steps, the active-bucket floor division and every price label.
 * For v2 it is purely a rendering parameter, chosen because v2's fixed 0.30% fee corresponds to
 * tick spacing 60 in v3. Change it here to make v2 bars coarser or finer.
 */
export const V2_SYNTHETIC_TICK_SPACING = 60

/**
 * Buckets synthesized on each side of the active tick. A constant-product pool has liquidity at
 * every price, so the window is a rendering budget, not a property of the pool — but it has to
 * outrun whatever the charts can display, because empty space past the last bucket reads as
 * "liquidity ends here" and truncates the depth ramp mid-slope.
 *
 * The binding consumer is the ±50% band the depth chart and order book keep (`OrderBook.tsx` drops
 * rows further than 50% from mid). Ticks are logarithmic, so the sell side costs more than the buy
 * side: at spacing 60, 116 buckets is the first count reaching -50% (6960 ticks → -50.1%/+100.6%;
 * 115 falls short at -49.8%). That also covers the liquidity chart's default ±50-bucket viewport
 * (`getDefaultViewport`) with room to pan. A literal MIN_TICK..MAX_TICK walk would be ~29k buckets,
 * each costing a tick→price conversion and a locked-amounts computation.
 */
export const V2_SYNTHETIC_BUCKETS_PER_SIDE = 116

/** Pair reserves in decimal-adjusted units, as `PoolData.tvlToken0` / `tvlToken1` supply them. */
export interface V2Reserves {
  reserve0: number
  reserve1: number
}

export interface V2SyntheticPool {
  /** sqrt(reserve0 · reserve1) in raw base units — the constant-product pool's uniform L. */
  liquidity: JSBI
  sqrtPriceX96: JSBI
  currentTick: number
  activeTick: number
  tickSpacing: number
  /**
   * The full-range distribution as raw ticks. `buildSegmentsFromRawTicks` collapses this pair into
   * exactly one segment spanning the whole range with `liquidityActive = L`.
   */
  rawTicks: TickData[]
}

/**
 * Scale a decimal-adjusted amount up by `decimals` into a raw base-unit integer.
 *
 * Goes through `toExponential`, which is the only numeric formatter with a canonical form at every
 * magnitude — `toString`/`toFixed` switch to exponent notation outside ~1e-7..1e21, which `BigInt`
 * cannot parse. Reserves are large enough that the multiply has to happen in JSBI, not floats.
 */
function toRawAmount(amount: number, decimals: number): JSBI | undefined {
  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined
  }

  const MANTISSA_DIGITS = 17
  const [mantissa, exponent] = amount.toExponential(MANTISSA_DIGITS).split('e')
  // `mantissa` is "d.ddd…" with MANTISSA_DIGITS fraction digits, so the digits read as an integer
  // are the value scaled by 10^(MANTISSA_DIGITS - exponent).
  const digits = JSBI.BigInt(mantissa.replace('.', ''))
  const scale = decimals + Number(exponent) - MANTISSA_DIGITS
  const magnitude = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(Math.abs(scale)))
  return scale >= 0 ? JSBI.multiply(digits, magnitude) : JSBI.divide(digits, magnitude)
}

/**
 * Derive the v3-equivalent state of a constant-product (x·y=k) v2 pair from its reserves.
 *
 * A v2 pair is a single full-range position: L is uniform across every tick, so L = sqrt(x·y) in
 * raw base units and the price is simply the raw reserve ratio. The tick comes from the v3-sdk's
 * own `getTickAtSqrtRatio` rather than a float logarithm, so it agrees by construction with the
 * `1.0001^tick · 10^(d0-d1)` convention the charts use to turn ticks back into prices.
 *
 * Returns undefined for a pool whose price falls outside the representable tick range, or when
 * either reserve is missing or zero.
 */
export function buildV2SyntheticPool({
  reserves,
  token0,
  token1,
  tickSpacing = V2_SYNTHETIC_TICK_SPACING,
}: {
  reserves: V2Reserves | undefined
  token0: Currency
  token1: Currency
  tickSpacing?: number
}): V2SyntheticPool | undefined {
  if (!reserves) {
    return undefined
  }

  const rawReserve0 = toRawAmount(reserves.reserve0, token0.decimals)
  const rawReserve1 = toRawAmount(reserves.reserve1, token1.decimals)
  // A reserve can also truncate to zero raw units when it is a dust fraction of one base unit.
  if (!rawReserve0 || !rawReserve1 || JSBI.equal(rawReserve0, ZERO) || JSBI.equal(rawReserve1, ZERO)) {
    return undefined
  }

  const liquidity = sqrt(JSBI.multiply(rawReserve0, rawReserve1))

  // sqrtPriceX96 = sqrt(reserve1 / reserve0) · 2^96, evaluated as one integer square root so the
  // Q64.96 fixed point never passes through a float.
  const sqrtPriceX96 = sqrt(JSBI.divide(JSBI.multiply(rawReserve1, Q192), rawReserve0))
  if (
    JSBI.lessThan(sqrtPriceX96, TickMath.MIN_SQRT_RATIO) ||
    JSBI.greaterThanOrEqual(sqrtPriceX96, TickMath.MAX_SQRT_RATIO)
  ) {
    return undefined
  }

  const currentTick = TickMath.getTickAtSqrtRatio(sqrtPriceX96)
  // Matches how the rest of the chart stack floors a tick into its bucket.
  const activeTick = Math.floor(currentTick / tickSpacing) * tickSpacing

  const minTick = nearestUsableTick(TickMath.MIN_TICK, tickSpacing)
  const maxTick = nearestUsableTick(TickMath.MAX_TICK, tickSpacing)

  return {
    liquidity,
    sqrtPriceX96,
    currentTick,
    activeTick,
    tickSpacing,
    rawTicks: [
      { tick: minTick, liquidityNet: liquidity.toString() },
      { tick: maxTick, liquidityNet: JSBI.unaryMinus(liquidity).toString() },
    ],
  }
}

/**
 * Expand a synthetic v2 pool into the bucketed `TickProcessed[]` the liquidity and depth charts
 * consume. Every bucket carries the same `liquidityActive` (uniform L) and `liquidityNet` of zero —
 * a v2 pair initializes no ticks, so liquidity never changes anywhere in the range.
 */
export function buildV2SyntheticTicksProcessed({
  pool,
  token0,
  token1,
  bucketsPerSide = V2_SYNTHETIC_BUCKETS_PER_SIDE,
}: {
  pool: V2SyntheticPool
  token0: Currency
  token1: Currency
  bucketsPerSide?: number
}): TickProcessed[] {
  const { activeTick, tickSpacing, liquidity } = pool
  const minTick = nearestUsableTick(TickMath.MIN_TICK, tickSpacing)
  const maxTick = nearestUsableTick(TickMath.MAX_TICK, tickSpacing)

  const ticksProcessed: TickProcessed[] = []
  for (let i = -bucketsPerSide; i <= bucketsPerSide; i++) {
    const tick = activeTick + i * tickSpacing
    if (tick < minTick || tick > maxTick) {
      continue
    }
    const sdkPrice = tickToPriceV4(token0, token1, tick)
    ticksProcessed.push({
      tick,
      liquidityActive: liquidity,
      liquidityNet: JSBI.BigInt(0),
      price0: sdkPrice.toFixed(PRICE_FIXED_DIGITS),
      sdkPrice,
    })
  }

  return ticksProcessed
}
