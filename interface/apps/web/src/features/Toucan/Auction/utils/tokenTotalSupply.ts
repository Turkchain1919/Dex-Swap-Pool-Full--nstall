/**
 * A token's total supply is absent when it is missing or zero. Every FDV surface multiplies a price by
 * this supply, so a zero supply leaves the valuation unrenderable rather than zero — and the raw value
 * is a decimal string, so `'0'` slips past a falsiness-only guard.
 *
 * Phrased positively so the predicate narrows `raw` to `string` where it holds: callers that go on to
 * do supply arithmetic bail out on `!hasTokenTotalSupply(raw)` and see a `string` past that check.
 */
export function hasTokenTotalSupply(raw: string | null | undefined): raw is string {
  return !!raw && raw !== '0'
}
