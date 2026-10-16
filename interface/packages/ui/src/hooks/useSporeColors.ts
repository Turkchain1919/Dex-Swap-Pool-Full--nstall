/**
 * Platform-split base stub — bundlers resolve `useSporeColors.web` /
 * `useSporeColors.native`. Shared types live here.
 */
import type { SporeColorToken, SporeThemeKeys, SporeThemeName } from 'ui/src/theme/color/types'
import { PlatformSplitStubError } from 'utilities/src/errors'

// copied from react-native (avoiding import for web)
type OpaqueColorValue = symbol & { __TYPE__: 'Color' }

export type DynamicColor = SporeColorToken | string | OpaqueColorValue

export type UseSporeColorsReturn = {
  [key in SporeThemeKeys]: {
    val: SporeColorToken
    get: () => DynamicColor
    variable: string
  }
}

/**
 * Provides the spore color theme (the same token → color map Tamagui's
 * `useTheme` resolved) from the app's active theme.
 * Do not pass a conditional value to `name`.
 *
 * @param name force a theme instead of following the app's active theme
 */
export const useSporeColors = (_name?: SporeThemeName | null): UseSporeColorsReturn => {
  throw new PlatformSplitStubError('useSporeColors')
}

export const useSporeColorsForTheme = (_name?: SporeThemeName | null): UseSporeColorsReturn => {
  throw new PlatformSplitStubError('useSporeColorsForTheme')
}
