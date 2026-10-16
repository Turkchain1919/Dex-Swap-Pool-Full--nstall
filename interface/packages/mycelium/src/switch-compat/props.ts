/**
 * The `Switch` compat prop contract and shared geometry (INFRA-3644),
 * transcribed from `ui/src/components/switch/types.ts` + `shared.ts` (the
 * Tamagui-free INFRA-3318 rebuild) and re-sourced onto mycelium tokens.
 * Platform-neutral: no react-native imports.
 */
import type { CSSProperties } from 'react'
import { spacing } from '../tokens'

/** The legacy `ui/src/components/types` SporeComponentVariant union, inlined. */
export type SwitchCompatVariant = 'branded' | 'default'

export const SWITCH_THUMB_HEIGHT = spacing.spacing24
export const SWITCH_THUMB_PADDING = spacing.spacing4
export const SWITCH_TRACK_HEIGHT = SWITCH_THUMB_HEIGHT + SWITCH_THUMB_PADDING * 2
export const SWITCH_TRACK_WIDTH = spacing.spacing60

/**
 * The legacy Check icon's glyph geometry (`ui/src/components/icons/Check.tsx`,
 * built from assets/icons/check.svg). The web leg renders mycelium's generated
 * `Check` icon (same source SVG); mycelium icons are web-only by design, so
 * the native leg draws these lines with `react-native-svg` — the
 * `ModalCloseIconCompat.native.tsx` mechanism.
 */
export const CHECK_GLYPH = {
  viewBox: '0 0 48 48',
  strokeWidth: 5,
  lines: [
    { x1: 11, y1: 26, x2: 18, y2: 33 },
    { x1: 18, y1: 33, x2: 38, y2: 14 },
  ],
} as const

/** The size every legacy Switch leg renders its check icon at. */
export const SWITCH_CHECK_ICON_SIZE = 14

/**
 * Local replacement for the Tamagui `SwitchProps` the legacy component used to
 * extend, kept to the prop surface consumers actually use so nothing
 * Tamagui-shaped leaks through the public API — the legacy `SwitchProps`
 * contract, verbatim.
 */
export type SwitchCompatProps = {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  variant: SwitchCompatVariant
  testID?: string
  /** Web only: forwarded to the underlying `button[role=switch]`; the native leg's narrowed contract omits it, matching the legacy leg. */
  id?: string
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only'
  /** Web only: overrides the resolved track color. Accepts a Spore color token (e.g. `$surface3`) or a raw color. */
  backgroundColor?: string
  /** Web only: extra inline styles merged in while disabled (legacy Tamagui `disabledStyle`). */
  disabledStyle?: CSSProperties
}
