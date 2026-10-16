/**
 * Web leg of the `useSporeColors` compat (`ui/src/hooks/useSporeColors`):
 * the same token → color map as the Tamagui hook, per active theme. `val` is
 * the theme's resolved value, `variable`/`get()` are the token's CSS variable
 * (theme-switched by the root class), and every token is exposed under both
 * its bare and `$`-prefixed key — matching the Tamagui theme proxy.
 *
 * Forcing a theme via `name` flips `val` only — `variable`/`get()` still
 * resolve against the root class at paint time (parity-pinned to the
 * reference). Compat consumers have no `<Theme>` subtree scoping, so
 * forced-name callers should style with `.val`.
 */
import { useSyncExternalStore } from 'react'
import { type CompatThemeName, getRootThemeSnapshot, getServerThemeSnapshot, subscribeToRootTheme } from './theme-state'
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS, THEME_COLOR_NAMES } from './tokens'
import type { SporeColorKey, UseSporeColorsReturn } from './useSporeColors'

const colorMaps: Partial<Record<CompatThemeName, UseSporeColorsReturn>> = {}

function colorsForTheme(theme: CompatThemeName): UseSporeColorsReturn {
  const cached = colorMaps[theme]
  if (cached !== undefined) {
    return cached
  }
  const source = theme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS
  // Entries are built with their honest runtime shape (`val` holds the
  // resolved color string) and the finished map is cast once to the
  // token-typed public contract — the same single-cast boundary the legacy
  // builder uses (`ui/src/hooks/sporeColorMap.ts`). See `SporeThemeColorToken`.
  const map: Partial<Record<SporeColorKey, { val: string; get: () => string; variable: string }>> = {}
  for (const name of THEME_COLOR_NAMES) {
    const variable = `var(--${name})`
    const entry = { val: source[name] as string, variable, get: (): string => variable }
    map[name] = entry
    map[`$${name}`] = entry
  }
  const built = map as unknown as UseSporeColorsReturn
  colorMaps[theme] = built
  return built
}

/**
 * Wraps the root-theme store to provide the Spore color theme.
 * Do not pass a conditional value to `name`.
 *
 * @param name force a theme instead of following the root class
 */
export const useSporeColors = (name?: CompatThemeName | null): UseSporeColorsReturn => {
  const active = useSyncExternalStore(subscribeToRootTheme, getRootThemeSnapshot, getServerThemeSnapshot)
  return colorsForTheme(name ?? active)
}
