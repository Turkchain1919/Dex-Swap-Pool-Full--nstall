/**
 * Native type metrics for the option label, transcribed from the legacy
 * buttonLabel3/buttonLabel4 variants (packages/ui/src/theme/fonts.ts):
 * base size 14 (large) / 12 (other sizes), +1px on non-CJK locales
 * (`adjustedSize`), line-height = fontSize * NATIVE_LINE_HEIGHT_SCALE,
 * weight 500 (MEDIUM_WEIGHT), maxFontSizeMultiplier 1.2.
 *
 * The shared @universe/tailwind `text-button-3/4` utilities carry the *web*
 * ramp (14px/20px/535 and 12px/16px/535), which the legacy native control
 * does not use — so these metrics are applied as an inline style for pixel
 * parity. See the base-gap note in the PR.
 */
export const NATIVE_LINE_HEIGHT_SCALE = 1.15

export const MEDIUM_WEIGHT = '500'

export const MAX_FONT_SIZE_MULTIPLIER = 1.2

export function optionFontMetrics({ large, smallFont }: { large: boolean; smallFont: boolean }): {
  fontSize: number
  lineHeight: number
} {
  const baseSize = large ? 14 : 12
  const fontSize = smallFont ? baseSize : baseSize + 1
  return { fontSize, lineHeight: fontSize * NATIVE_LINE_HEIGHT_SCALE }
}
