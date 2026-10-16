/**
 * Forced-theme variant of `useSporeColors` (`ui/src`'s
 * `makeUseSporeColorsForTheme` composition): calls it twice — forced dark +
 * active theme — and picks, so both subscriptions stay mounted and hook order
 * is stable when `name` flips between renders.
 *
 * ONE platform-free file, not a split: the only platform-dependent piece is
 * `useSporeColors` itself, reached extensionless so each bundler resolves its
 * own leg (the `useExtractedTokenColor` shape — a composition over the split,
 * not a leg of it).
 */
import type { CompatThemeName } from './theme-state'
import { useSporeColors, type UseSporeColorsReturn } from './useSporeColors'

export const useSporeColorsForTheme = (name?: CompatThemeName | null): UseSporeColorsReturn => {
  const darkColors = useSporeColors('dark')
  const themeColors = useSporeColors()
  return name === 'dark' ? darkColors : themeColors
}
