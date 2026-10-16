// `ColorTokens` re-exported by `ui/src`'s barrel: mutually assignable with Tamagui's own
// `ColorTokens` for this config, so this annotation-only usage converts by import swap alone
// (INFRA-3228; see `packages/mycelium/src/compat/color-tokens.ts`).
import type { ColorTokens } from '@universe/mycelium'

export type TamaguiColor =
  | ColorTokens
  | 'transparent'
  | `rgba(${string})`
  | `rgb(${string})`
  | `hsl(${string})`
  | `hsla(${string})`
  | `#${string}`

export type ColorStrategy = 'vibrant' | 'muted'

export type ExtractedColors = {
  primary?: string
  secondary?: string
  base?: string
  detail?: string
}

export type LogolessColorScheme = {
  light: { foreground: TamaguiColor; background: TamaguiColor }
  dark: { foreground: TamaguiColor; background: TamaguiColor }
}
