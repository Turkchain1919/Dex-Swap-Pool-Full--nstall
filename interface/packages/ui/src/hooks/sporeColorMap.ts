/**
 * Shared, platform-free pieces of `useSporeColors` — the platform legs
 * (`useSporeColors.web.ts` / `useSporeColors.native.ts`) differ only in their
 * theme source and per-token entry shape, so the map contract lives once here.
 */
import type { UseSporeColorsReturn } from 'ui/src/hooks/useSporeColors'
import { colors } from 'ui/src/theme/color/colors'
import type { SporeThemeName } from 'ui/src/theme/color/types'
import { themes } from 'ui/src/theme/themes'

export type SporeColorEntry = { val: string; get: () => string; variable: string }

/**
 * Builds a memoized per-theme token → color map with the exact shape the
 * legacy Tamagui theme proxy exposed: the palette colors layered under the
 * active theme's values (theme wins on collision), every token under both its
 * bare and `$`-prefixed key. The entry factory carries the only platform
 * difference (web: CSS-variable indirection; native: resolved values).
 */
export function createSporeColorMapCache(
  makeEntry: (name: string, val: string) => SporeColorEntry,
): (theme: SporeThemeName) => UseSporeColorsReturn {
  const cache: Partial<Record<SporeThemeName, UseSporeColorsReturn>> = {}

  return (theme: SporeThemeName): UseSporeColorsReturn => {
    const cached = cache[theme]
    if (cached !== undefined) {
      return cached
    }
    const source: Record<string, string> = { ...colors, ...themes[theme] }
    const map: Record<string, SporeColorEntry> = {}
    for (const name of Object.keys(source)) {
      const entry = makeEntry(name, source[name] as string)
      map[name] = entry
      map[`$${name}`] = entry
    }
    const built = map as unknown as UseSporeColorsReturn
    cache[theme] = built
    return built
  }
}

type UseSporeColorsHook = (name?: SporeThemeName | null) => UseSporeColorsReturn

/**
 * Composes a platform's `useSporeColors` into the forced-theme variant. Lives
 * here (not the base file) because the base must stay a pure platform-split
 * stub, and each leg must compose its own resolved `useSporeColors`.
 */
export function makeUseSporeColorsForTheme(useSporeColorsForPlatform: UseSporeColorsHook): UseSporeColorsHook {
  return function useSporeColorsForTheme(name?: SporeThemeName | null): UseSporeColorsReturn {
    const darkColors = useSporeColorsForPlatform('dark')
    const themeColors = useSporeColorsForPlatform()

    return name === 'dark' ? darkColors : themeColors
  }
}
