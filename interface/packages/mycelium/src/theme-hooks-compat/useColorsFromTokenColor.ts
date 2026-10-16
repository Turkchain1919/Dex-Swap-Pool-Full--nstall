/**
 * Compat twin of `ui/src`'s `useColorsFromTokenColor` (INFRA-3477): the same
 * memoized `validTokenColor` / `lightTokenColor` pair, typed as the plain
 * color strings the theme-hooks compat exposes instead of Tamagui
 * `ColorTokens`. Validation reuses the ported `validColor`
 * (`compat/color-validation`, INFRA-3601) — same rough format check and
 * dev-time throw as the reference. A single shared leg — the only
 * platform-varying dependency, `opacify`, splits at its own module boundary
 * (`opacify.web` / `opacify.native`). Parity guard:
 * `packages/tailwind/src/parity/theme-hooks/use-colors-from-token-color.test.tsx`.
 */
import { useMemo } from 'react'
import { validColor } from '../compat/color-validation'
import { opacify } from './opacify'

/** The percentage opacity `lightTokenColor` applies to the validated color. */
const LIGHT_TOKEN_COLOR_OPACITY = 12

/** The memoized pair `useColorsFromTokenColor` returns, as plain color strings. */
export type UseColorsFromTokenColorReturn = Record<'validTokenColor' | 'lightTokenColor', string | undefined>

/**
 * Given an optional token color (e.g. a token's brand color), returns a
 * memoized pair: `validTokenColor` — the input when it passes `validColor`'s
 * rough format check, `undefined` when the input is missing; and
 * `lightTokenColor` — a 12%-opacity variant of the validated color (via
 * `opacify`, which keeps inputs it cannot parse unchanged), used as a soft
 * background tint. Non-production builds throw on rough-check-invalid input
 * (the `validColor` contract, which fires on the empty string too — the
 * check runs before the falsy mapping).
 */
export const useColorsFromTokenColor = (tokenColor?: string): UseColorsFromTokenColorReturn => {
  const { validTokenColor, lightTokenColor } = useMemo(() => {
    const validatedColor = validColor(tokenColor)

    return {
      validTokenColor: tokenColor ? validatedColor : undefined,
      lightTokenColor: tokenColor && validatedColor ? opacify(LIGHT_TOKEN_COLOR_OPACITY, validatedColor) : undefined,
    }
  }, [tokenColor])

  return { validTokenColor, lightTokenColor }
}
