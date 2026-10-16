/**
 * Native leg of the `useSporeColors` compat (INFRA-2353): the same token →
 * color map as the Tamagui hook resolves on device. The theme source is
 * uniwind's runtime theme (`Uniwind.setTheme`, driven by the app's theme
 * provider — the native analog of the web root class).
 *
 * Native token contract (parity-pinned against the real Tamagui native
 * builds): CSS variables don't exist on device, so `variable` is the empty
 * string and `get()` returns the resolved value — exactly what Tamagui's
 * native theme proxy exposes. Forcing a theme via `name` flips the whole map.
 */
import { useUniwind } from 'uniwind'
import type { CompatThemeName } from './theme-state'
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS, THEME_COLOR_NAMES } from './tokens'
import type { SporeColorKey, UseSporeColorsReturn } from './useSporeColors'

export type {
  DynamicColor,
  SporeColor,
  SporeColorKey,
  SporeThemeColorToken,
  UseSporeColorsReturn,
} from './useSporeColors'

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
    const val = source[name] as string
    const entry = { val, variable: '', get: (): string => val }
    map[name] = entry
    map[`$${name}`] = entry
  }
  const built = map as unknown as UseSporeColorsReturn
  colorMaps[theme] = built
  return built
}

/**
 * Wraps uniwind's theme to provide the Spore color theme.
 * Do not pass a conditional value to `name`.
 *
 * @param name force a theme instead of following uniwind's runtime theme
 */
export const useSporeColors = (name?: CompatThemeName | null): UseSporeColorsReturn => {
  const { theme } = useUniwind()
  const active: CompatThemeName = theme === 'dark' ? 'dark' : 'light'
  return colorsForTheme(name ?? active)
}
