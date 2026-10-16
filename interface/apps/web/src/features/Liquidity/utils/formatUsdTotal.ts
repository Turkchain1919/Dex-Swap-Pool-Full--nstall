import type { LocalizationContextState } from 'uniswap/src/features/language/LocalizationContext'
import { NumberType } from 'utilities/src/format/types'

/**
 * Below this the display form already carries the whole figure, so a tooltip adds nothing.
 * Only abbreviated displays (>= $1M) truncate anyway; the threshold's real job is suppressing the
 * $1.0x band, whose three-decimal display would otherwise pair with a LESS precise tooltip.
 */
const FULL_VALUE_TOOLTIP_MIN_USD = 1000

/**
 * Shared formatting for USD totals across the fee surfaces (summary chips, Your fees modal hero),
 * so a sub-cent wallet reads the same everywhere. `display` is the on-surface text; `full` is the
 * untruncated figure for a tooltip, present only when it differs from `display` and the value is
 * at least $1 — below that the display form already carries the whole figure.
 */
export function formatUsdTotal(
  value: number | undefined,
  convertFiatAmountFormatted: LocalizationContextState['convertFiatAmountFormatted'],
): { display: string; full?: string } {
  if (value === undefined) {
    return { display: '-' }
  }
  const full = convertFiatAmountFormatted(value, NumberType.PortfolioBalance)
  // FiatTokenDetails formats exact zero as "$0"; zero isn't truncated, so keep the "$0.00" form.
  if (value === 0) {
    return { display: full }
  }
  // Sub-cent totals display as "<$0.01", matching the per-position fee rows.
  if (value < 0.01) {
    return { display: convertFiatAmountFormatted(value, NumberType.FiatTokenQuantity) }
  }
  const display = convertFiatAmountFormatted(value, NumberType.FiatTokenDetails)
  if (value < FULL_VALUE_TOOLTIP_MIN_USD) {
    return { display }
  }
  return { display, full: full === display ? undefined : full }
}
