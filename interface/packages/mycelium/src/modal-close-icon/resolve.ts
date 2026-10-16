/**
 * Platform-neutral pieces shared by both `ModalCloseIconCompat` legs — the X
 * glyph geometry and the size/color resolution. Sharing them is what keeps the
 * two legs rendering the same icon (the `checkbox-compat` mechanism).
 */
import { ICON_SIZE_TOKEN_PX, lookupToken, type SporeIconSizeToken } from '../compat/tokens'
import type { SporeColor, SporeColorKey, UseSporeColorsReturn } from '../theme-hooks-compat'

/**
 * The X icon's geometry, copied from `../components/icons/X.tsx` (the icon
 * pipeline's port of the `ui/src` X, whose path data the icons parity suite
 * pins). The native leg cannot render that component — mycelium icons emit a
 * DOM `<svg>` — so both legs draw from this constant instead; the drift pin in
 * `ModalCloseIconCompat.test.tsx` asserts it stays byte-identical to the
 * rendered X.
 */
export const X_GLYPH = {
  viewBox: '0 0 16 16',
  path: 'M12.5303 4.53033C12.8232 4.23744 12.8232 3.76256 12.5303 3.46967C12.2374 3.17678 11.7626 3.17678 11.4697 3.46967L12.5303 4.53033ZM3.46967 11.4697C3.17678 11.7626 3.17678 12.2374 3.46967 12.5303C3.76256 12.8232 4.23744 12.8232 4.53033 12.5303L3.46967 11.4697ZM4.53033 3.46967C4.23744 3.17678 3.76256 3.17678 3.46967 3.46967C3.17678 3.76256 3.17678 4.23744 3.46967 4.53033L4.53033 3.46967ZM11.4697 12.5303C11.7626 12.8232 12.2374 12.8232 12.5303 12.5303C12.8232 12.2374 12.8232 11.7626 12.5303 11.4697L11.4697 12.5303ZM11.4697 3.46967L3.46967 11.4697L4.53033 12.5303L12.5303 4.53033L11.4697 3.46967ZM3.46967 4.53033L11.4697 12.5303L12.5303 11.4697L4.53033 3.46967L3.46967 4.53033Z',
} as const

/** Resolve legacy `$icon.N` size tokens to px; numbers pass through. Unknown tokens throw — same as the icon factory. */
export function closeIconSizePx(size: SporeIconSizeToken | number): number {
  if (typeof size === 'number') {
    return size
  }
  const px = lookupToken(ICON_SIZE_TOKEN_PX, size)
  if (px === undefined) {
    throw new Error(`ModalCloseIcon: unknown icon size token "${size}"`)
  }
  return px
}

/**
 * Resolve a `$`-color token through the `useSporeColors` theme map — the full
 * legacy palette (every key legacy Tamagui themes carry, `$neutral2Hovered`
 * included), unlike the icon factory's token subset. `.val` is the active
 * theme's resolved literal, which both a DOM `style.color` and a
 * `react-native-svg` `fill` accept. Non-token strings pass through unchanged;
 * a `$`-token outside the theme map throws — same as FlexCompat — rather than
 * reaching the leaf raw.
 */
export function resolveCloseIconColor(value: string, colors: UseSporeColorsReturn): string {
  if (!value.startsWith('$')) {
    return value
  }
  const entry = (colors as Partial<Record<SporeColorKey, SporeColor>>)[value as SporeColorKey]
  if (entry === undefined) {
    throw new Error(`ModalCloseIcon: color token "${value}" has no theme counterpart`)
  }
  return entry.val
}
