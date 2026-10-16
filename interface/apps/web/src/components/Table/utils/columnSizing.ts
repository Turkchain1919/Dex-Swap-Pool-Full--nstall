import type { TableColumnMeta } from '~/components/Table/types'

/** Horizontal padding a table `Cell` applies on each side ($spacing12). */
const CELL_HORIZONTAL_PADDING_PX = 12

/**
 * Whitespace budget between adjacent fixed data columns when both render max-width content,
 * beyond cell padding. Matches the Explore stocks table's 1D change ↔ market cap rhythm.
 */
export const DATA_COLUMN_GAP_PX = 32

/** Max rendered content widths (px, body2 + tabular nums) for common data column types. */
export const DATA_COLUMN_CONTENT_WIDTH_PX = {
  /** Fiat price, e.g. `$99,999.99` (NumberType.FiatTokenPrice). */
  price: 80,
  /** Delta arrow + percent, e.g. `↑ 99.99%`. */
  percentChange: 68,
  /** Abbreviated fiat stat, e.g. `$999.9B` (NumberType.FiatTokenStats). */
  fiatStat: 60,
  /** Abbreviated fiat stat with room for a trailing affordance (e.g. volume info icon). */
  volume: 84,
} as const

/**
 * Volume follows market cap/FDV; its leading gap is tightened by 16px so the mcap/FDV↔volume
 * pair reads tighter than the rest of the data-column rhythm.
 */
const MCAP_TO_VOLUME_GAP_REDUCTION_PX = 16
export const VOLUME_COLUMN_GAP_PX = DATA_COLUMN_GAP_PX - MCAP_TO_VOLUME_GAP_REDUCTION_PX

/** Sparkline chart column — fixed chart width, not a right-aligned text column. */
export const SPARKLINE_COLUMN_WIDTH_PX = 120

export interface ColumnSizing {
  size: number
  minSize: number
  maxSize: number
  meta: TableColumnMeta
}

/**
 * Fixed, non-flexing column of exactly `sizePx`. Leftover table width flows to the flexible
 * (name/description) column instead of inflating fixed columns unevenly.
 */
export function getFixedColumnSizing(sizePx: number, meta?: TableColumnMeta): ColumnSizing {
  return { size: sizePx, minSize: sizePx, maxSize: sizePx, meta: { flexGrow: 0, ...meta } }
}

/**
 * Flexible column that absorbs leftover table width beyond `minSizePx` (e.g. the token/name
 * column), keeping the fixed data columns right-anchored as a group. `minSizePx` is the flex
 * basis; the same free space is handed to every row, so pinned dividers stay aligned.
 */
export function getFlexColumnSizing(minSizePx: number, meta?: TableColumnMeta): ColumnSizing {
  return { size: minSizePx, minSize: minSizePx, maxSize: Number.MAX_SAFE_INTEGER, meta: { flexGrow: 1, ...meta } }
}

/**
 * Sizing for a right-aligned data column: max content width + cell padding + the inter-column
 * gap, so adjacent data columns keep a consistent optical rhythm regardless of table width or
 * column count. `gapPx` defaults to the shared rhythm; pass a smaller value to tighten a pair.
 */
export function getDataColumnSizing(
  contentWidthPx: number,
  options?: { meta?: TableColumnMeta; gapPx?: number },
): ColumnSizing {
  const { meta, gapPx = DATA_COLUMN_GAP_PX } = options ?? {}
  return getFixedColumnSizing(contentWidthPx + 2 * CELL_HORIZONTAL_PADDING_PX + gapPx, meta)
}
