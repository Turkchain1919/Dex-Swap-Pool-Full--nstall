import {
  NATIVE_BOOK_WEIGHT,
  NATIVE_MEDIUM_WEIGHT,
  nativePlatformFont,
  nativeVariantFont,
} from '../text-compat/native-font'
/**
 * Native leg of the Input compat font tables: platform font names and
 * `adjustedSize`-corrected metrics, resolved through the text-compat native
 * font machinery (the transcription of `ui/src/theme/fonts.ts`'s native
 * branch, drift-guarded there) so the two compat surfaces cannot disagree
 * about what a `$body`/`$small` token means on device.
 */
import { nativeFontEnvironment } from '../text-compat/native-font-environment'

const { platform, smallFont } = nativeFontEnvironment()

function familyName(family: 'book' | 'medium' | 'mono'): string {
  return nativePlatformFont({ family, weight: undefined, platform }).fontFamily
}

export const fontFamilyTokens = {
  heading: familyName('book'),
  subHeading: familyName('book'),
  body: familyName('book'),
  button: familyName('medium'),
  monospace: familyName('mono'),
}

export type FontFamilyKey = keyof typeof fontFamilyTokens

function variantSize(variant: string): number {
  return nativeVariantFont({ variant, smallFont }).fontSize
}

/** Per-family `$size` token → font-size scales (native `adjustedSize` applied). */
export const fontSizeScales: Record<FontFamilyKey, Record<string, number>> = {
  heading: {
    small: variantSize('heading3'),
    medium: variantSize('heading2'),
    true: variantSize('heading2'),
    large: variantSize('heading1'),
  },
  subHeading: {
    small: variantSize('subheading2'),
    large: variantSize('subheading1'),
    true: variantSize('subheading1'),
  },
  body: {
    nano: variantSize('body5'),
    micro: variantSize('body4'),
    small: variantSize('body3'),
    medium: variantSize('body2'),
    true: variantSize('body2'),
    large: variantSize('body1'),
  },
  button: {
    micro: variantSize('buttonLabel4'),
    small: variantSize('buttonLabel3'),
    medium: variantSize('buttonLabel2'),
    large: variantSize('buttonLabel1'),
    true: variantSize('buttonLabel2'),
  },
  monospace: {
    micro: variantSize('body4'),
    small: variantSize('body3'),
    medium: variantSize('body2'),
    large: variantSize('body1'),
    true: variantSize('body4'),
  },
}

/** `$book`/`$medium`/`$true` weight tokens — the native 400/500, never the web-app 485/535. */
export const defaultWeights = {
  book: NATIVE_BOOK_WEIGHT,
  true: NATIVE_BOOK_WEIGHT,
  medium: NATIVE_MEDIUM_WEIGHT,
}

/** `$true` weight in a `$button` font context (the legacy BUTTON_MEDIUM_WEIGHT). */
export const BUTTON_MEDIUM_WEIGHT = NATIVE_MEDIUM_WEIGHT

/**
 * The default-frame typography (legacy body/$medium). `lineHeight` is
 * deliberately undefined: Tamagui's input size variant deletes it on native.
 */
export const defaultFrameFont: { fontSize: number; lineHeight: number | undefined } = {
  fontSize: variantSize('body2'),
  lineHeight: undefined,
}
