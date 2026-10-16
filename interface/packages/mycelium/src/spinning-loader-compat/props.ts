/**
 * The `SpinningLoader` compat prop contract and shared glyph geometry
 * (INFRA-3644), transcribed from `ui/src/loading/types.ts` (the Tamagui-free
 * INFRA-3286 rebuild's surface). Platform-neutral: no react-native imports.
 */
import type { IconProps } from '../components/factories/createIcon'
import type { ThemeColorName } from '../theme-hooks-compat/tokens'
import type { UseSporeColorsReturn } from '../theme-hooks-compat/useSporeColors'

export type SpinningLoaderCompatProps = {
  size?: number
  disabled?: boolean
  // Forwarded verbatim to the CircleSpinner icon on web, so the icon's own color surface is the
  // honest type (a superset of the legacy Tamagui ColorTokens union — no consumer breaks).
  color?: IconProps['color']
  /** Web only: skips the sized/centered frames around the rotating glyph; the native leg ignores it, matching the legacy leg. */
  unstyled?: boolean
}

/**
 * The legacy spinner glyph geometry (`ui/src/components/icons/CircleSpinner.tsx`
 * / `EmptySpinner.tsx`, mirrored name-for-name by mycelium's web-only icons).
 * The web leg renders the mycelium icon components; mycelium icons have no
 * native leg by design, so the native leg draws these with `react-native-svg`
 * — the `ModalCloseIconCompat.native.tsx` mechanism.
 */
export const CIRCLE_SPINNER_GLYPH = {
  viewBox: '0 0 24 24',
  strokeWidth: 3,
  trackPath:
    'M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z',
  trackOpacity: 0.1,
  arcPath: 'M21 12C21 7.02944 16.9706 3 12 3',
} as const

export const EMPTY_SPINNER_GLYPH = {
  viewBox: '0 0 20 20',
  strokeWidth: 3,
  circle: { cx: 10, cy: 10, r: 8 },
  strokeOpacity: 0.24,
} as const

/**
 * Native-leg color resolution: Spore tokens resolve through the theme-hooks
 * compat (the legacy icon factory resolved them via `useSporeColors`), raw
 * strings pass through. Only string colors reach the native glyphs — the
 * legacy legs always hand the icons a token or a raw color.
 */
export function resolveSpinnerColor(colors: UseSporeColorsReturn, value: IconProps['color']): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  if (value.startsWith('$')) {
    const token = value.slice(1)
    if (token in colors) {
      return colors[token as ThemeColorName].val
    }
  }
  return value
}
