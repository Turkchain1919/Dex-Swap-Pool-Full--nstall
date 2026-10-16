/**
 * Computes the default lower/upper prices for the range: the middle 60% (20%–80%) of a viewport
 * that is centered on the current price and fits the historical price bounds.
 *
 * The math is done in log-price (ratio) space. Tick spacing is logarithmic — price = 1.0001^tick —
 * so a range that is symmetric in *ratio* around the current price maps to a symmetric tick offset,
 * which is what "±X% around current" means for an LP position (and it handles token-decimal
 * differences for free). Doing this in linear price space (currentPrice ± spread) drove the lower
 * bound negative for volatile pairs whose historical high sits far above the current price; it then
 * floored to 0 → MIN_TICK and produced a one-sided "100% single token" default range (LP-1674).
 *
 * Returns `undefined` when the inputs can't define a log-space range (any non-positive price, e.g.
 * an empty price history), letting the caller fall back to the stable strategy.
 */
export function calculateDefaultPriceRange({
  priceDataMin,
  priceDataMax,
  currentPrice,
}: {
  priceDataMin: number
  priceDataMax: number
  currentPrice: number
}): { minPrice: number; maxPrice: number } | undefined {
  if (currentPrice <= 0 || priceDataMin <= 0 || priceDataMax <= 0) {
    return undefined
  }

  const logCurrent = Math.log(currentPrice)
  const logMin = Math.log(priceDataMin)
  const logMax = Math.log(priceDataMax)

  // Viewport centered on the current price that fits all data (symmetric in log space).
  const maxSpread = Math.max(logCurrent - logMin, logMax - logCurrent)
  const viewportRange = 2 * maxSpread
  const minVisibleLogPrice = logCurrent - viewportRange / 2

  // Take the 20%-80% of the viewport range (middle 60%) as the default range.
  return {
    minPrice: Math.exp(minVisibleLogPrice + viewportRange * 0.2),
    maxPrice: Math.exp(minVisibleLogPrice + viewportRange * 0.8),
  }
}
