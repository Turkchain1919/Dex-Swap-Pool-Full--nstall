import { QUICK_LAUNCH_TOTAL_SUPPLY_RAW } from '@uniswap/liquidity-launcher-sdk'
import { Q96 } from '~/features/Toucan/Auction/BidDistributionChart/utils/q96'

interface CalculateMinValidBidParams {
  clearingPriceQ96: bigint
  floorPriceQ96: bigint
  tickSizeQ96: bigint
}

/**
 * Calculates the minimum valid bid price according to contract rules.
 *
 * Contract constraints:
 * 1. Bids must be at tick boundaries (TickStorage.sol:42)
 * 2. Bids must be strictly above the clearing price (ContinuousClearingAuction.sol:409)
 *
 * Scenarios:
 * - At auction start: clearing price = floor price, minimum bid = floor + 1 tick
 * - Clearing price between ticks: minimum bid = next tick strictly above clearing
 * - Clearing price exactly at a tick: minimum bid = clearing + 1 tick (must be strictly above)
 */
export function calculateMinValidBidQ96({
  clearingPriceQ96,
  floorPriceQ96,
  tickSizeQ96,
}: CalculateMinValidBidParams): bigint {
  if (tickSizeQ96 <= 0n) {
    return clearingPriceQ96 + 1n
  }

  const delta = clearingPriceQ96 - floorPriceQ96
  const ticksBelowClearing = delta / tickSizeQ96

  // Whether clearing price is exactly at a tick boundary or between ticks,
  // minimum bid is always the first tick strictly above clearing price
  const ticksAboveFloor = ticksBelowClearing + 1n

  return floorPriceQ96 + ticksAboveFloor * tickSizeQ96
}

interface CalculateMaxValidBidParams {
  maxBidPriceQ96: bigint
  floorPriceQ96: bigint
  tickSizeQ96: bigint
}

/**
 * The highest bid price a max-bid-price validation hook will accept: the largest tick
 * at or below the hook's ceiling, on the same floor-anchored grid as
 * {@link calculateMinValidBidQ96}.
 *
 * The hook reverts when `maxPrice > maxBidPrice` (MaxBidPriceValidationHook.validate),
 * and the auction independently requires bids to sit on a tick, so the effective
 * ceiling is the ceiling rounded DOWN to the grid — never up, which would revert.
 *
 * Returns undefined when the ceiling sits below the floor price: no tick on the grid
 * is at or below it, so no bid can ever be valid.
 */
export function calculateMaxValidBidQ96({
  maxBidPriceQ96,
  floorPriceQ96,
  tickSizeQ96,
}: CalculateMaxValidBidParams): bigint | undefined {
  if (maxBidPriceQ96 < floorPriceQ96) {
    return undefined
  }

  if (tickSizeQ96 <= 0n) {
    return maxBidPriceQ96
  }

  // delta is non-negative here, so BigInt truncation is a floor -- which is what we want.
  const delta = maxBidPriceQ96 - floorPriceQ96
  return floorPriceQ96 + (delta / tickSizeQ96) * tickSizeQ96
}

/**
 * Whether the auction can still take a new bid under the hook's ceiling.
 *
 * Bids must be strictly above the clearing price AND at or below the ceiling, so once
 * the clearing price reaches the last tick under the ceiling there is no valid price
 * left and the auction is effectively closed to new bids. Existing bids stay active
 * and keep partially filling.
 */
export function isMaxBidPriceReached({
  clearingPriceQ96,
  floorPriceQ96,
  tickSizeQ96,
  maxBidPriceQ96,
}: CalculateMinValidBidParams & { maxBidPriceQ96: bigint }): boolean {
  const maxValidBid = calculateMaxValidBidQ96({ maxBidPriceQ96, floorPriceQ96, tickSizeQ96 })
  if (maxValidBid === undefined) {
    return true
  }
  const minValidBid = calculateMinValidBidQ96({ clearingPriceQ96, floorPriceQ96, tickSizeQ96 })
  return minValidBid > maxValidBid
}

/**
 * Checks if a bid price is below the minimum valid bid.
 * Returns true if the bid would be rejected by the contract.
 */
export function isBidBelowMinimum({
  bidPriceQ96,
  clearingPriceQ96,
  floorPriceQ96,
  tickSizeQ96,
}: {
  bidPriceQ96: bigint
  clearingPriceQ96: bigint
  floorPriceQ96: bigint
  tickSizeQ96: bigint
}): boolean {
  const minValidBid = calculateMinValidBidQ96({ clearingPriceQ96, floorPriceQ96, tickSizeQ96 })
  return bidPriceQ96 < minValidBid
}

/**
 * Product ceiling for a quick-launch bid: the order stays active up to a 25,000 ETH fully diluted
 * valuation. ETH-pinned by design (the quick-launch preset raises in native ETH only), NOT a USD
 * peg converted at bid time — ≈$50M FDV at current prices. Quick launches have no max-FDV input,
 * and a multiple of the current price (the previous 50x default) is NOT safe: clearing can rise
 * past any fixed multiple during the window, silently dropping the bid. Two distinct bounds
 * protect the bidder: spend is capped at the committed budget by the uniform-price mechanism, and
 * THIS constant is the reservation price — the explicit ceiling on the valuation a bid stays
 * active at. Mirrors the pools.trade product's constant
 * (labs/rh-cca/app/lib/bid/bidMath.ts BID_MAX_FDV_ETH).
 */
export const QUICK_LAUNCH_MAX_BID_FDV_ETH = 25_000n

const WEI_PER_ETH = 10n ** 18n

/**
 * {@link QUICK_LAUNCH_MAX_BID_FDV_ETH} as a Q96 price per token base unit: FDV in ETH-wei spread
 * across the quick-launch preset's fixed total supply (1e27 raw — the SDK's `isQuickLaunch`
 * classifier only matches auctions minted with exactly that preset supply, so every auction on
 * this path has it). 25_000e18 × 2^96 / 1e27 = 2^96 / 40_000; the integer floor is fine because
 * the submitted price is snapped further down to each auction's tick grid anyway.
 */
export const QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 =
  (QUICK_LAUNCH_MAX_BID_FDV_ETH * WEI_PER_ETH * Q96) / QUICK_LAUNCH_TOTAL_SUPPLY_RAW

/**
 * The `maxPrice` (Q96) for a quick-launch bid: {@link QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96}
 * snapped DOWN to the auction's floor-anchored tick grid (the contract only accepts tick-boundary
 * prices, and snapping up would overshoot the product cap), and never below the contract minimum —
 * the first tick strictly above clearing. The clamp only binds when clearing already implies an
 * FDV above the cap; the bid then goes in minimally-above-clearing instead of failing. Mirrors
 * labs/rh-cca bidMaxPriceQ96.
 */
export function calculateQuickLaunchMaxBidQ96({
  clearingPriceQ96,
  floorPriceQ96,
  tickSizeQ96,
}: CalculateMinValidBidParams): bigint {
  const minValidBid = calculateMinValidBidQ96({ clearingPriceQ96, floorPriceQ96, tickSizeQ96 })

  if (tickSizeQ96 <= 0n) {
    return QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 > minValidBid ? QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 : minValidBid
  }

  const delta = QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 - floorPriceQ96
  // Toward-zero division: a floor at or above the cap lands at or below the floor here, and the
  // minimum-valid clamp takes over.
  const snappedDown = floorPriceQ96 + (delta / tickSizeQ96) * tickSizeQ96

  // Invariant: when the grid is too coarse to express the cap (tick size exceeds cap − floor, or
  // clearing already sits at/above the cap), the result truncates to `minValidBid` — a
  // one-tick-above-clearing ceiling, which may exceed the cap because the contract requires
  // strictly-above-clearing. That is the minimal valid bid, not an uncapped one.
  return snappedDown > minValidBid ? snappedDown : minValidBid
}

interface SnapToNearestTickParams {
  value: bigint
  floorPrice: bigint
  clearingPrice: bigint
  tickSize: bigint
}

/**
 * Snaps a price value to the nearest valid tick boundary.
 * The result is guaranteed to be:
 * 1. At a tick boundary (aligned to floor price + N * tick size)
 * 2. Strictly above the clearing price (contract requirement)
 */
export function snapToNearestTick({ value, floorPrice, clearingPrice, tickSize }: SnapToNearestTickParams): bigint {
  if (tickSize <= 0n) {
    return value
  }

  const delta = value - floorPrice
  // If value is below floor price, we still want to align it to the grid defined by floorPrice.
  // However, we also need to respect the clearingPrice minimum (strictly above).

  const quotient = delta / tickSize
  const remainder = delta % tickSize

  // Calculate the minimum valid bid (strictly above clearing price)
  const minValidBid = calculateMinValidBidQ96({
    clearingPriceQ96: clearingPrice,
    floorPriceQ96: floorPrice,
    tickSizeQ96: tickSize,
  })

  // If exact match on a tick, check if it's valid (strictly above clearingPrice)
  if (remainder === 0n) {
    const snapped = floorPrice + quotient * tickSize
    // Must be strictly above clearing price, so >= minValidBid
    return snapped < minValidBid ? minValidBid : snapped
  }

  // Round to nearest tick
  // Note: remainder can be negative if value < floorPrice (though unlikely for bids)
  const shouldRoundUp = remainder * 2n >= tickSize
  const ticksFromFloor = quotient + (shouldRoundUp ? 1n : 0n)

  const snappedValue = floorPrice + ticksFromFloor * tickSize

  // Ensure result is strictly above clearing price
  if (snappedValue < minValidBid) {
    return minValidBid
  }

  return snappedValue
}
