import { colors, colorsLight } from 'ui/src/theme/color/colors'
import { themes } from 'ui/src/theme/themes'

export type GlobalPalette = typeof colors
export type GlobalColorNames = keyof GlobalPalette
export type Palette = typeof colorsLight

/** Registered Spore theme names (ui/src/theme/themes.ts). */
export type SporeThemeName = keyof typeof themes

/**
 * Key set of the active Spore theme — the Tamagui-free equivalent of
 * Tamagui's `ThemeKeys` for this config (both derive from the same
 * `themes.light` object, so the unions stay identical).
 */
export type SporeThemeKeys = keyof (typeof themes)['light']

/**
 * Every `$`-prefixed color token this config accepts: the palette colors plus
 * the theme keys. A subset of Tamagui's `ColorTokens` for this config (which
 * additionally allows CSS color names), so values typed with this union stay
 * assignable everywhere Tamagui's `ColorTokens` is expected.
 */
export type SporeColorToken = `$${GlobalColorNames & string}` | `$${SporeThemeKeys & string}`
