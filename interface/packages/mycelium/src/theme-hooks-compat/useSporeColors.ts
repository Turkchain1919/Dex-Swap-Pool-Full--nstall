/**
 * Platform-split base stub — bundlers resolve `useSporeColors.web` /
 * `useSporeColors.native` (the `ui/src` convention). Shared types live here.
 */
import { PlatformSplitStubError } from '@universe/environment'
import type { CompatThemeName } from './theme-state'
import type { ThemeColorName } from './tokens'

/**
 * Token-typed like the legacy hook's `val`: the runtime value is the resolved
 * color string, but the token type keeps `.val` assignable wherever
 * `ColorTokens` is expected (pinned in parity/color-tokens/type-parity.ts).
 */
export type SporeThemeColorToken = `$${ThemeColorName}`

/** `get()` output: the CSS variable on web, the resolved value on native. */
export type DynamicColor = string

export interface SporeColor {
  val: SporeThemeColorToken
  get: () => DynamicColor
  variable: string
}

export type SporeColorKey = ThemeColorName | `$${ThemeColorName}`

export type UseSporeColorsReturn = Readonly<Record<SporeColorKey, SporeColor>>

export const useSporeColors = (_name?: CompatThemeName | null): UseSporeColorsReturn => {
  throw new PlatformSplitStubError('useSporeColors')
}
