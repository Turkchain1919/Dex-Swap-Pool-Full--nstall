/**
 * Compat twin of `ui/src/utils/colors/hooks/useColorSchemeFromSeed`
 * (INFRA-3488): same signature and values, Tamagui-free. The scheme table is a
 * frozen copy of the `ui/src` `logolessColorSchemes` literals (declared in the
 * `LogolessColors` enum-key order the index math depends on); the parity suite
 * in `packages/tailwind/src/parity/color-scheme-from-seed` is the drift guard.
 *
 * Shared across platforms: the only platform-dependent input is the theme,
 * read through the platform-split `useIsDarkMode` compat leg.
 */
import { useMemo } from 'react'
import { useIsDarkMode } from './useIsDarkMode'

/** Hex color literal — every logoless scheme value is one. Assignable where `ui/src`'s `TamaguiColor` is expected. */
export type SeedColor = `#${string}`

/** The foreground/background pair `useColorSchemeFromSeed` returns. */
export interface UseColorSchemeFromSeedReturn {
  foreground: SeedColor
  background: SeedColor
}

interface LogolessSeedScheme {
  light: UseColorSchemeFromSeedReturn
  dark: UseColorSchemeFromSeedReturn
}

// Order is load-bearing: it mirrors `Object.keys(LogolessColors)` in
// `ui/src/utils/colors/constants.ts` (PINK, ORANGE, YELLOW, GREEN, TURQUOISE,
// CYAN, BLUE, PURPLE), which the seed → index math selects into.
const LOGOLESS_COLOR_SCHEMES: readonly LogolessSeedScheme[] = [
  {
    // PINK
    light: { foreground: '#FC74FE', background: '#FEF4FF' },
    dark: { foreground: '#FC74FE', background: '#361A37' },
  },
  {
    // ORANGE
    light: { foreground: '#FF7715', background: '#FFF2F1' },
    dark: { foreground: '#FF7715', background: '#2E0805' },
  },
  {
    // YELLOW
    light: { foreground: '#FFBF17', background: '#FFFCF2' },
    dark: { foreground: '#FFF612', background: '#1F1E02' },
  },
  {
    // GREEN
    light: { foreground: '#2FBA61', background: '#EEFBF1' },
    dark: { foreground: '#2FBA61', background: '#0F2C1A' },
  },
  {
    // TURQUOISE
    light: { foreground: '#00C3A0', background: '#F7FEEB' },
    dark: { foreground: '#5CFE9D', background: '#1A2A21' },
  },
  {
    // CYAN
    light: { foreground: '#2ABDFF', background: '#EBF8FF' },
    dark: { foreground: '#2ABDFF', background: '#15242B' },
  },
  {
    // BLUE
    light: { foreground: '#3271FF', background: '#EFF4FF' },
    dark: { foreground: '#3271FF', background: '#10143D' },
  },
  {
    // PURPLE
    light: { foreground: '#9E62FF', background: '#FAF5FF' },
    dark: { foreground: '#9E62FF', background: '#1A0040' },
  },
]

/** Char-code sum mod option count — the `ui/src` `getLogolessColorIndex` algorithm, verbatim. */
function getLogolessColorIndex(seed: string, numOptions: number): number {
  const charCodes = Array.from(seed).map((char) => char.charCodeAt(0))
  const sum = charCodes.reduce((acc, curr) => acc + curr, 0)
  return sum % numOptions
}

/**
 * Picks the deterministic logoless color scheme for `seed` (an icon with no
 * logo derives its colors from its name) and returns the active theme's
 * foreground/background pair. Same seeds yield the same scheme as the
 * `ui/src` original.
 */
export function useColorSchemeFromSeed(seed: string): UseColorSchemeFromSeedReturn {
  const isDarkMode = useIsDarkMode()
  const logolessColorScheme = useMemo(() => {
    const index = getLogolessColorIndex(seed, LOGOLESS_COLOR_SCHEMES.length)
    // SAFETY: `index` is `sum % length`, always within [0, length).
    return LOGOLESS_COLOR_SCHEMES[index] as LogolessSeedScheme
  }, [seed])
  const { foreground, background } = isDarkMode ? logolessColorScheme.dark : logolessColorScheme.light

  return { foreground, background }
}
