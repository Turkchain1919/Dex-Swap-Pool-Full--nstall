import { nearestUsableTick, TickMath } from '@uniswap/v3-sdk'

/**
 * Keeps a range's bounds ordered when only one of them is being set.
 *
 * A single incoming bound is clamped against the bound currently held, so setting a min at or
 * above the held max pulls it one spacing below instead (and the mirror for max). This is the
 * reason a whole range has to reach the parent as one update: sending it as two single-bound
 * updates lets the first be clamped against a bound the second is about to replace.
 *
 * Shared with the chart store's tests so the two can't drift apart.
 */
export function clampMinTick({
  tick,
  maxTick,
  tickSpacing,
}: {
  tick?: number
  maxTick?: number
  tickSpacing: number
}): number | undefined {
  if (tick !== undefined && maxTick !== undefined && tick >= maxTick) {
    // Stepping below the held max can walk past the usable range at the bottom edge
    return Math.max(maxTick - tickSpacing, nearestUsableTick(TickMath.MIN_TICK, tickSpacing))
  }
  return tick
}

export function clampMaxTick({
  tick,
  minTick,
  tickSpacing,
}: {
  tick?: number
  minTick?: number
  tickSpacing: number
}): number | undefined {
  if (tick !== undefined && minTick !== undefined && tick <= minTick) {
    // Mirrored at the top edge
    return Math.min(minTick + tickSpacing, nearestUsableTick(TickMath.MAX_TICK, tickSpacing))
  }
  return tick
}

/**
 * Applies a whole range at once. There is no stale opposite bound to clamp against here — that is
 * the entire reason a range has to reach the parent as one update rather than two.
 */
export function setMinMaxTickRange<T extends { minTick?: number; maxTick?: number }>({
  prev,
  minTick,
  maxTick,
}: {
  prev: T
  minTick?: number
  maxTick?: number
}): T {
  return { ...prev, minTick, maxTick }
}
