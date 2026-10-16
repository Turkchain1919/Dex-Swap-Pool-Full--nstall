/**
 * Web leg of `useSporeColors`: the same token → color map Tamagui's `useTheme`
 * resolved, built Tamagui-free by ./sporeColorMap.
 *
 * The theme source is the root `light`/`dark` class (ui/src/theme/themeState),
 * which each app's theme provider keeps in lockstep with the Tamagui root
 * theme. `val` is the theme's resolved value; `variable`/`get()` are the
 * token's CSS variable — theme-switched by the root class at paint time.
 * Forcing a theme via `name` flips `val` only, exactly as the Tamagui hook
 * behaved (parity-pinned in packages/tailwind/src/parity/theme-hooks).
 */
import { useSyncExternalStore } from 'react'
import { createSporeColorMapCache, makeUseSporeColorsForTheme } from 'ui/src/hooks/sporeColorMap'
import type { UseSporeColorsReturn } from 'ui/src/hooks/useSporeColors'
import type { SporeThemeName } from 'ui/src/theme/color/types'
import { getRootThemeSnapshot, getServerThemeSnapshot, subscribeToRootTheme } from 'ui/src/theme/themeState'

export type { DynamicColor, UseSporeColorsReturn } from 'ui/src/hooks/useSporeColors'

const colorsForTheme = createSporeColorMapCache((name, val) => {
  const variable = `var(--${name})`
  return { val, variable, get: () => variable }
})

/**
 * Provides the spore color theme from the root theme class.
 * Do not pass a conditional value to `name`.
 *
 * @param name force a theme instead of following the root class
 */
export const useSporeColors = (name?: SporeThemeName | null): UseSporeColorsReturn => {
  const active = useSyncExternalStore(subscribeToRootTheme, getRootThemeSnapshot, getServerThemeSnapshot)
  return colorsForTheme(name ?? active)
}

export const useSporeColorsForTheme = makeUseSporeColorsForTheme(useSporeColors)
