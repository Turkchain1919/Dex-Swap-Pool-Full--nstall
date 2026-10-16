import {
  type CustomPriceRangeEntry,
  type CustomPriceRangePreset,
  type CustomPriceRangeValue,
  CUSTOM_PRICE_RANGE_POSITIVE_INFINITY,
  MAX_CUSTOM_PRICE_RANGE_ENTRIES,
  MIN_CUSTOM_PRICE_RANGE_PERCENT_FROM_CLEARING,
} from '~/pages/Liquidity/CreateAuction/types'
const CUSTOM_PRICE_RANGE_ID_PREFIX = 'custom-range-'
/**
 * Identifies the derived full-range remainder in hover/histogram lookups keyed by entry id. It is
 * never stored: the prefix above keeps real row ids from colliding with it.
 */
export const FULL_RANGE_REMAINDER_ENTRY_ID = 'full-range-remainder'

/**
 * The band the migrator's implicit position covers — the whole range. Exported so the editor row,
 * the review table and {@link withFullRangeRemainderEntry} all render one shape.
 */
export const FULL_RANGE_REMAINDER_BOUNDS: Pick<
  CustomPriceRangeEntry,
  'minPercentFromClearing' | 'maxPercentFromClearing'
> = {
  minPercentFromClearing: MIN_CUSTOM_PRICE_RANGE_PERCENT_FROM_CLEARING,
  maxPercentFromClearing: CUSTOM_PRICE_RANGE_POSITIVE_INFINITY,
}
const CUSTOM_PRICE_RANGE_PERCENT_PRECISION = 10 ** 5

function roundCustomPriceRangePercent(percent: number): number {
  return Math.round(percent * CUSTOM_PRICE_RANGE_PERCENT_PRECISION) / CUSTOM_PRICE_RANGE_PERCENT_PRECISION
}

export function clampCustomPriceRangeLiquidityPercent(percent: number): number {
  if (!Number.isFinite(percent)) {
    return 0
  }
  return roundCustomPriceRangePercent(Math.min(Math.max(percent, 0), 100))
}

export function createDefaultCustomPriceRangeEntry(): CustomPriceRangeEntry {
  return {
    id: `${CUSTOM_PRICE_RANGE_ID_PREFIX}1`,
    liquidityPercent: 100,
    minPercentFromClearing: MIN_CUSTOM_PRICE_RANGE_PERCENT_FROM_CLEARING,
    maxPercentFromClearing: CUSTOM_PRICE_RANGE_POSITIVE_INFINITY,
  }
}

function getNextCustomPriceRangeId(entries: CustomPriceRangeEntry[]): string {
  const maxNumericId = entries.reduce((maxId, entry) => {
    const parsed = Number(entry.id.replace(CUSTOM_PRICE_RANGE_ID_PREFIX, ''))
    return Number.isFinite(parsed) ? Math.max(maxId, parsed) : maxId
  }, 0)
  return `${CUSTOM_PRICE_RANGE_ID_PREFIX}${maxNumericId + 1}`
}

export function getCustomPriceRangeLiquidityTotal(entries: CustomPriceRangeEntry[]): number {
  return roundCustomPriceRangePercent(entries.reduce((sum, entry) => sum + entry.liquidityPercent, 0))
}

/**
 * Decimals the UI renders a liquidity percent at. Entries are stored to
 * {@link CUSTOM_PRICE_RANGE_PERCENT_PRECISION} (5 decimals), so a remainder can be non-zero and
 * still round away here — see {@link shouldShowFullRangeRemainder}.
 */
export const CUSTOM_PRICE_RANGE_PERCENT_DISPLAY_DECIMALS = 4

/**
 * The share of the LP budget the rows leave unallocated. The migrator opens a single full-range
 * position for exactly this slice (`PositionPlanner.resolve` appends one carrying whatever the
 * concentrated positions do not consume), so it is a real position, not a validation shortfall.
 * An over-allocated set reports 0 — its problem is the overshoot, not a remainder.
 */
export function getCustomPriceRangeFullRangeRemainderPercent(entries: CustomPriceRangeEntry[]): number {
  return clampCustomPriceRangeLiquidityPercent(100 - getCustomPriceRangeLiquidityTotal(entries))
}

/**
 * Why the allocated total is unusable, or `undefined` when it is fine. The editor picks its error
 * copy from this and {@link isCustomPriceRangeAllocationValid} gates the step on it, so the bounds
 * cannot drift into blocking without a message or explaining while advancing.
 */
export type CustomPriceRangeTotalProblem = 'unallocated' | 'overAllocated'

export function getCustomPriceRangeTotalProblem(
  entries: CustomPriceRangeEntry[],
): CustomPriceRangeTotalProblem | undefined {
  const total = getCustomPriceRangeLiquidityTotal(entries)
  if (total <= 0) {
    return 'unallocated'
  }
  if (total > 100) {
    return 'overAllocated'
  }
  return undefined
}

/**
 * Whether the remainder earns a row of its own. Two cases where it does not:
 *
 * - a total of zero, where the remainder is the whole budget but the editor is already blocking on
 *   "allocate liquidity to at least one range" — a "Full range 100%" row beside that contradicts it;
 * - a remainder below display precision, which would render as a `0%` row (three rows of 33.33333
 *   leave 0.00001 behind, and the inputs accept those five decimals).
 */
export function shouldShowFullRangeRemainder(entries: CustomPriceRangeEntry[]): boolean {
  if (getCustomPriceRangeTotalProblem(entries) !== undefined) {
    return false
  }
  const displayScale = 10 ** CUSTOM_PRICE_RANGE_PERCENT_DISPLAY_DECIMALS
  return Math.round(getCustomPriceRangeFullRangeRemainderPercent(entries) * displayScale) / displayScale > 0
}

/**
 * `entries` plus the full-range remainder as a synthetic entry, for consumers that render it as one
 * more range — the histogram. Returns `entries` unchanged when the remainder does not earn a row.
 *
 * Prepended, not appended. The histogram sorts widest band first and its comparator returns 0 on a
 * tie, so a stable sort keeps input order; a real range ties the remainder whenever it spans
 * -100 / +∞, which the default row does. First place is what puts the remainder on the bottom
 * layer, behind the ranges it backs.
 */
export function withFullRangeRemainderEntry(entries: CustomPriceRangeEntry[]): CustomPriceRangeEntry[] {
  if (!shouldShowFullRangeRemainder(entries)) {
    return entries
  }
  return [
    {
      id: FULL_RANGE_REMAINDER_ENTRY_ID,
      liquidityPercent: getCustomPriceRangeFullRangeRemainderPercent(entries),
      ...FULL_RANGE_REMAINDER_BOUNDS,
    },
    ...entries,
  ]
}

/** Removes rows with no liquidity allocated. Sum of remaining percents is unchanged. */
export function stripZeroPercentCustomPriceRangeEntries(entries: CustomPriceRangeEntry[]): CustomPriceRangeEntry[] {
  const filtered = entries.filter((entry) => clampCustomPriceRangeLiquidityPercent(entry.liquidityPercent) > 0)
  if (filtered.length === entries.length || filtered.length === 0) {
    return entries
  }
  return filtered
}

export function addCustomPriceRangePreset(
  entries: CustomPriceRangeEntry[],
  preset: CustomPriceRangePreset,
): CustomPriceRangeEntry[] {
  if (entries.length >= MAX_CUSTOM_PRICE_RANGE_ENTRIES) {
    return entries
  }

  const remainingPercent = clampCustomPriceRangeLiquidityPercent(100 - getCustomPriceRangeLiquidityTotal(entries))
  return [
    ...entries,
    {
      id: getNextCustomPriceRangeId(entries),
      liquidityPercent: remainingPercent,
      minPercentFromClearing: preset.minPercentFromClearing,
      maxPercentFromClearing: preset.maxPercentFromClearing,
    },
  ]
}

export function updateCustomPriceRangeLiquidityPercent({
  entries,
  entryId,
  percent,
}: {
  entries: CustomPriceRangeEntry[]
  entryId: string
  percent: number
}): CustomPriceRangeEntry[] {
  return entries.map((entry) =>
    entry.id === entryId ? { ...entry, liquidityPercent: clampCustomPriceRangeLiquidityPercent(percent) } : entry,
  )
}

export function updateCustomPriceRangeBounds({
  entries,
  entryId,
  bounds,
}: {
  entries: CustomPriceRangeEntry[]
  entryId: string
  bounds: Partial<Pick<CustomPriceRangeEntry, 'minPercentFromClearing' | 'maxPercentFromClearing'>>
}): CustomPriceRangeEntry[] {
  return entries.map((entry) => (entry.id === entryId ? { ...entry, ...bounds } : entry))
}

export function removeCustomPriceRangeEntry(
  entries: CustomPriceRangeEntry[],
  entryId: string,
): CustomPriceRangeEntry[] {
  if (entries.length <= 1) {
    return entries
  }

  // The removed row's percent is not pushed onto a surviving row: with totals below 100 allowed,
  // it simply becomes remainder and the full-range position absorbs it. Rows the user did not
  // touch keep the numbers they were given.
  return entries.filter((entry) => entry.id !== entryId)
}

function isFiniteCustomPriceRangeValue(value: CustomPriceRangeValue): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidMinimumPriceRangeValue(value: CustomPriceRangeValue): boolean {
  return isFiniteCustomPriceRangeValue(value) && value >= MIN_CUSTOM_PRICE_RANGE_PERCENT_FROM_CLEARING && value <= 0
}

function isValidMaximumPriceRangeValue(value: CustomPriceRangeValue): boolean {
  return value === CUSTOM_PRICE_RANGE_POSITIVE_INFINITY || (isFiniteCustomPriceRangeValue(value) && value >= 0)
}

export function isCustomPriceRangeEntryValid(entry: CustomPriceRangeEntry): boolean {
  const { minPercentFromClearing, maxPercentFromClearing } = entry
  if (
    !isValidMinimumPriceRangeValue(minPercentFromClearing) ||
    !isValidMaximumPriceRangeValue(maxPercentFromClearing)
  ) {
    return false
  }

  if (isFiniteCustomPriceRangeValue(minPercentFromClearing) && isFiniteCustomPriceRangeValue(maxPercentFromClearing)) {
    return minPercentFromClearing < maxPercentFromClearing
  }

  return true
}

/**
 * Totals below 100% are valid — the remainder becomes a full-range position
 * ({@link getCustomPriceRangeFullRangeRemainderPercent}). The two ends still are not:
 * over-allocation reverts in `PositionPlanner` (`totalWeight > MPS`), and a total of zero leaves no
 * concentrated position to define — every row strips out before the request is built, and a
 * zero-weight definition reverts as `ZeroPositionWeight`. A launch that wants only a full-range
 * position selects the full-range strategy instead.
 */
export function isCustomPriceRangeAllocationValid(entries: CustomPriceRangeEntry[]): boolean {
  return (
    entries.length > 0 &&
    entries.length <= MAX_CUSTOM_PRICE_RANGE_ENTRIES &&
    getCustomPriceRangeTotalProblem(entries) === undefined &&
    entries.every(isCustomPriceRangeEntryValid)
  )
}
