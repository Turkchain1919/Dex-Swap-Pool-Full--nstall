/**
 * Native leg of the legacy font machinery port: `getFontStylesForVariant`
 * resolves the NATIVE column the legacy fonts.ts renders on device — the
 * adjusted ramp (+1px except CJK locales, line-heights computed from the
 * adjusted size) and the platform Basel font naming — by composing the
 * INFRA-3461 resolvers in `./native-font` with the device environment probe.
 */
import type { FontVariantToken } from '@universe/tailwind/types'
import { getTextVariantKey, VARIANT_LETTER_SPACING, type ResolvedFontStyle } from './font-variant-shared'
import { nativePlatformFont, nativeVariantFont } from './native-font'
import { nativeFontEnvironment } from './native-font-environment'

export { ALL_FONT_VARIANT_TOKENS, getTextVariantKey } from './font-variant-shared'
export type { ResolvedFontStyle, TextVariantKey } from './font-variant-shared'

/**
 * Resolve a variant token (e.g. `$body3`) for raw inline styles. Matches the
 * legacy native resolution: variant metrics from the adjusted ramp, the
 * platform font name (iOS embedded family, Android file name), and the
 * fonts-table nominal weight. The book variants carry '400', so the Android
 * book-plus-medium file swap in `nativePlatformFont` never engages here —
 * exactly as legacy, whose fonts table pairs each family with its own weight.
 */
export function getFontStylesForVariant(token: FontVariantToken): ResolvedFontStyle {
  const key = getTextVariantKey(token)
  const { platform, smallFont } = nativeFontEnvironment()
  const font = nativeVariantFont({ variant: key, smallFont })
  const { fontFamily } = nativePlatformFont({ family: font.family, weight: font.fontWeight, platform })
  return {
    fontSize: font.fontSize,
    lineHeight: font.lineHeight,
    family: fontFamily,
    fontWeight: font.fontWeight,
    letterSpacing: VARIANT_LETTER_SPACING[key],
  }
}
