import { createSporeColorMapCache, makeUseSporeColorsForTheme } from 'ui/src/hooks/sporeColorMap'
import type { UseSporeColorsReturn } from 'ui/src/hooks/useSporeColors'
import type { SporeThemeName } from 'ui/src/theme/color/types'
/**
 * Native leg of `useSporeColors`: the same token → color map Tamagui's
 * `useTheme` resolved on device, built Tamagui-free by ./sporeColorMap. The
 * theme source is uniwind's runtime theme (`Uniwind.setTheme`, driven by the
 * app's theme provider — the native analog of the web root class).
 *
 * Native token contract (parity-pinned against the real Tamagui native
 * builds): CSS variables don't exist on device, so `variable` is the empty
 * string and `get()` returns the resolved value. Forcing a theme via `name`
 * flips the whole map.
 */
import { useUniwind } from 'uniwind'

export type { DynamicColor, UseSporeColorsReturn } from 'ui/src/hooks/useSporeColors'

const colorsForTheme = createSporeColorMapCache((_name, val) => ({ val, variable: '', get: () => val }))

/**
 * Provides the spore color theme from uniwind's runtime theme.
 * Do not pass a conditional value to `name`.
 *
 * @param name force a theme instead of following uniwind's runtime theme
 */
export const useSporeColors = (name?: SporeThemeName | null): UseSporeColorsReturn => {
  const { theme } = useUniwind()
  const active: SporeThemeName = theme === 'dark' ? 'dark' : 'light'
  return colorsForTheme(name ?? active)
}

export const useSporeColorsForTheme = makeUseSporeColorsForTheme(useSporeColors)
