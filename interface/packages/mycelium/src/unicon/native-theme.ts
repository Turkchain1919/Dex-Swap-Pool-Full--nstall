/**
 * Pure narrowing helpers for the native Unicon's theme lookups. Platformless
 * so the fallback logic is unit-testable without a React Native runtime (the
 * shimmer `glare-color.ts` precedent).
 */
import { UNICON_COLORS } from './colors'

// Every hex form React Native's color parser accepts: #RGB, #RGBA, #RRGGBB,
// #RRGGBBAA. The real `--color-unicon-N-*` literals in
// packages/tailwind/css/theme.css are all 6-digit (pinned by test against the
// real file); the shorter/alpha forms are accepted so a palette edit to one
// of them doesn't silently divert to the fallback.
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/**
 * Web's `--unicon-bg-opacity` in @universe/tailwind (0.1216 light / 0.1608
 * dark — legacy's 0x1F/0x29 alpha bytes); the light value doubles as the
 * fallback when the token doesn't resolve.
 */
export const FALLBACK_UNICON_BG_OPACITY = 0.1216

/**
 * Narrows a theme-provided `--unicon-N` value to a renderable hex color
 * (react-native-svg fills need a parseable color, not a `var()` reference).
 * Falls back to the static light-palette hex for the same index when the
 * uniwind variable store hands back anything else — deterministic and visible
 * rather than an invisible avatar.
 */
export function resolveUniconColor(value: unknown, colorIndex: number): string {
  if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value)) {
    return value
  }
  return UNICON_COLORS.light[colorIndex] ?? UNICON_COLORS.light[0]
}

/**
 * Narrows to an opacity in [0, 1], or undefined when the value is unusable.
 * Empty/whitespace strings are rejected explicitly — `Number('')` is 0, which
 * would pass the range guard and render the circle transparent instead of
 * falling back.
 */
function narrowBgOpacity(value: unknown): number | undefined {
  const numeric =
    typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1 ? numeric : undefined
}

/** Narrows a theme-provided `--unicon-bg-opacity` (unitless number token) to a usable opacity, falling back to the light bucket value. */
export function resolveUniconBgOpacity(value: unknown): number {
  return narrowBgOpacity(value) ?? FALLBACK_UNICON_BG_OPACITY
}

/** Whether {@link resolveUniconBgOpacity} passes this value through rather than falling back (the dev-warning predicate). */
export function isUsableUniconBgOpacity(value: unknown): boolean {
  return narrowBgOpacity(value) !== undefined
}
