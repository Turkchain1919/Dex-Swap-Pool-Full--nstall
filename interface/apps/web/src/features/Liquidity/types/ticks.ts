/**
 * A pool tick's net liquidity change at a tick index — the unit the liquidity range charts and
 * `computeSurroundingTicks` consume. Owned natively by the Liquidity feature; the
 * liquidity-service `GetPoolTicks` rows (which carry extra fields) satisfy it structurally.
 *
 * Fields are optional defensively; the liquidity-service rows always populate both.
 */
export interface TickData {
  tick?: number
  liquidityNet?: string
}
