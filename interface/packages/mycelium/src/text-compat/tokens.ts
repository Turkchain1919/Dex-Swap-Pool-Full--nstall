/**
 * Text-specific token layer over the shared compat maps (`../compat/tokens`):
 * the web-app font weight tokens and the pinned theme color model. Color and
 * typography values come from the generated mirror
 * (`theme-tokens.generated.ts` + `spore-text-colors.generated.css`); the
 * computed-style harness in `labs/workbench/scripts/verify-text-parity.mts`
 * is the drift guard.
 */
import type { OpaqueColorValue } from 'react-native'
import { arbitrary } from '../compat/style-classes'
import { resolveColorOrWarn, type TamaguiVariable } from '../compat/tokens'
import { THEME_COLOR_TOKENS, type ThemeColorToken } from './theme-tokens.generated'

export { lookupToken, RADIUS_TOKEN_PX, SPACE_TOKEN_PX } from '../compat/tokens'
export type { SporeRadiusToken, SporeSpaceToken } from '../compat/tokens'

/** Web-app font weight tokens (fonts.ts defaultWeights under isWebApp). */
export const FONT_WEIGHT_TOKEN = {
  book: 485,
  medium: 535,
  true: 485,
} as const

/** `$neutral1` / `neutral1` — Tamagui accepts theme color tokens with or without `$`. */
export type SporeColorToken = `$${ThemeColorToken}` | ThemeColorToken

const THEME_COLOR_TOKEN_SET: ReadonlySet<string> = new Set(THEME_COLOR_TOKENS)

/**
 * Resolve a color value to a CSS expression: theme tokens (with or without the
 * `$` prefix) become their pinned `--stext-*` var (theme-switched by the
 * `.dark` ancestor class), anything else passes through as raw CSS color.
 * Unknown `$` tokens throw instead of guessing.
 */
export function colorCssExpression(value: string | TamaguiVariable | OpaqueColorValue): string {
  // `resolveColorOrWarn` also covers a legacy `OpaqueColorValue` (INFRA-3804):
  // this always compiles to a CSS expression on both platforms (no native
  // style-object passthrough exists here), so a dropped value degrades to
  // transparent instead of crashing — no real call site passes one today.
  const resolved = resolveColorOrWarn(value) ?? 'transparent'
  const name = resolved.startsWith('$') ? resolved.slice(1) : resolved
  if (THEME_COLOR_TOKEN_SET.has(name)) {
    return `var(--stext-${name})`
  }
  if (resolved.startsWith('$')) {
    throw new Error(`TextCompat: color token "${resolved}" has no pinned spore counterpart`)
  }
  return resolved
}

/** `[color:…]`-style arbitrary property for a theme token or raw color. */
export function colorPropertyClass(cssProp: string, value: string | TamaguiVariable | OpaqueColorValue): string {
  return `[${cssProp}:${arbitrary(colorCssExpression(value))}]`
}

export { FONT_DEFINITIONS, THEME_COLOR_TOKENS, VARIANT_METRICS } from './theme-tokens.generated'
export type { FontDefinition, TextVariant, ThemeColorToken } from './theme-tokens.generated'
