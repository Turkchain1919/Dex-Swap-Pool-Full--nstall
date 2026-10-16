import { iconSizes } from '@universe/mycelium'
import { getTokenDescriptionColumnSize } from '~/pages/Explore/tables/Tokens/TokenDescription'

/**
 * Single source of geometry for the mobile launch-table token-column collapse, shared by
 * `useTokenColumnCollapse` (which drives the progress) and `CollapsibleTokenCell` (which
 * interpolates against it) so the two can't drift apart.
 */

/** 0 → expanded, 1 → fully collapsed. Written to the table root by `useTokenColumnCollapse`; every visual reads it through `calc()`, so a collapse never re-renders React. */
export const COLLAPSE_PROGRESS_VAR = '--launch-token-collapse'

/**
 * `visible` | `hidden` for the fading name/symbol block. Opacity alone leaves text in the
 * accessibility tree (screen readers still announce it), so the hook flips this to `hidden` once
 * the text has fully faded — as a custom property, not React state, so it stays render-free.
 */
export const COLLAPSE_TEXT_VISIBILITY_VAR = '--launch-token-collapse-text'

/**
 * `pan-y` once the column is collapsed at all, `auto` otherwise. A horizontal drag starting on the
 * collapsed column has to reach the hook's `touchmove` handler instead of being consumed by the
 * browser as a scroll — that is what makes the column re-grow *instead of* the table scrolling.
 * `pan-y` rather than `none` so vertical page scrolling still works from the column.
 */
export const COLLAPSE_TOUCH_ACTION_VAR = '--launch-token-collapse-touch-action'

/** Expanded pinned token column on mobile — matches Explore's mobile token column (#37542). */
export const EXPANDED_TOKEN_COLUMN_WIDTH = getTokenDescriptionColumnSize(true)

/** Fully collapsed pinned token column: the scaled-up logo, centered, and nothing else. */
export const COLLAPSED_TOKEN_COLUMN_WIDTH = 72

/** How much narrower the pinned column gets across a full collapse. */
export const TOKEN_COLUMN_SHRINK_PX = EXPANDED_TOKEN_COLUMN_WIDTH - COLLAPSED_TOKEN_COLUMN_WIDTH

/** Gesture travel that fully collapses — or, on the collapsed column itself, fully re-grows — the column. */
export const COLLAPSE_SCROLL_RANGE_PX = 100

export const EXPANDED_LOGO_SIZE = iconSizes.icon32
/** Collapsed thumbnail size (design ask: scale the sticky logo up a little). Applied as a transform, so the cell's layout box stays `EXPANDED_LOGO_SIZE`. */
export const COLLAPSED_LOGO_SIZE = 36

/** Gap between logo and name/symbol when expanded (matches TokenDescription's `$gap8` + `$spacing4`); interpolates to 0 so the collapsed logo lands centered. */
export const EXPANDED_LOGO_GAP_PX = 12

/** Progress at which the name/symbol block has fully faded — also where it leaves the accessibility tree. */
export const TEXT_FADE_END_PROGRESS = 0.55

/** `var()` reference to the collapse progress, for composing `calc()` expressions. */
export const COLLAPSE_PROGRESS = `var(${COLLAPSE_PROGRESS_VAR}, 0)`

/** `touch-action` for the pinned token cells (see COLLAPSE_TOUCH_ACTION_VAR). */
export function getCollapseTouchActionCss(): string {
  return `var(${COLLAPSE_TOUCH_ACTION_VAR}, auto)`
}

/**
 * Painted width of the pinned token column at a given collapse progress — the one definition of the
 * curve. `useTokenColumnCollapse` hit-tests the column's right edge against it, and
 * `getTokenColumnWidthCss` renders the same curve, so the re-grow arming region can't drift off the
 * painted edge.
 */
export function getTokenColumnWidthPx(progress: number): number {
  return EXPANDED_TOKEN_COLUMN_WIDTH - TOKEN_COLUMN_SHRINK_PX * progress
}

/**
 * Rendered width of the pinned token column. Tanstack's column size stays at the expanded width;
 * only the painted width follows the collapse (see `TableColumnMeta.widthOverride`). Derived from
 * `getTokenColumnWidthPx`'s endpoints — the curve is linear, so those two values define it.
 */
export function getTokenColumnWidthCss(): string {
  const expandedPx = getTokenColumnWidthPx(0)
  return `calc(${expandedPx}px - ${COLLAPSE_PROGRESS} * ${expandedPx - getTokenColumnWidthPx(1)}px)`
}

/**
 * The scroll travel the collapse has consumed, rendered as margin after the pinned column.
 *
 * This is what makes the gesture pay for the transition before the table scrolls: the margin grows
 * by exactly the distance `scrollLeft` advanced, so the data columns hold their place relative to
 * the pinned column's right edge and only start sliding underneath it once progress reaches 1. The
 * margin itself always sits hidden beneath the sticky pinned column, so it never reads as a gap.
 */
export function getConsumedScrollMarginCss(): string {
  return `calc(${COLLAPSE_PROGRESS} * ${COLLAPSE_SCROLL_RANGE_PX}px)`
}
