/**
 * The chart's price series and tick scale are in display orientation (inverted when `priceInverted`).
 *
 * A pool being created gets its current price from `getInitialPrice`, which is always canonical
 * (token1-per-token0), whereas an existing pool gets a display-oriented price (`getPrice` inverts).
 * So only the create flow needs to be re-oriented: without this, the current price appended to the
 * chart's (already inverted) price history is a huge outlier that wrecks the price bounds and
 * collapses the default range to one side (min → ~0, max → huge).
 *
 * The value is a human-readable display price, so its display inverse is simply the reciprocal.
 */
export function toDisplayCurrentPrice({
  currentPrice,
  priceInverted,
  creatingPoolOrPair,
}: {
  currentPrice?: number
  priceInverted: boolean
  creatingPoolOrPair?: boolean
}): number | undefined {
  if (!currentPrice) {
    return currentPrice
  }
  return creatingPoolOrPair && priceInverted ? 1 / currentPrice : currentPrice
}
