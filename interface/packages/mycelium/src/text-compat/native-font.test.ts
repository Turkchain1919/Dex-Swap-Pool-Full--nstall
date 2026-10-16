/**
 * Pins the NATIVE type ramp per variant per platform (INFRA-3461): the
 * fontFamily/fontWeight/fontSize/lineHeight the TextCompat style lane emits so
 * converted mobile Text keeps rendering the loaded Basel fonts, exactly as the
 * legacy ui/src Text does. The expected values were MEASURED from native
 * Tamagui (`renderTamaguiNative` over `ui/src` Text in the tailwind parity
 * harness), not derived: iOS addresses the embedded family name "Basel
 * Grotesk" (weight picks the face), Android addresses the font FILE name; the
 * `smallFont: false` column carries fonts.ts `adjustedSize` (+1px, non-CJK
 * locales); the line-heights fonts.ts still writes as a multiple are computed
 * FROM that adjusted size, while its fixed-px line-heights are shared with web.
 */
import { describe, expect, it } from 'vitest'
import {
  nativeFamilyForFontToken,
  nativePlatformFont,
  nativeVariantFont,
  nativeVariantMaxFontSizeMultiplier,
  nativeVariantMetric,
  resolveNativeFontMetric,
} from './native-font'
import { FONT_DEFINITIONS, VARIANT_METRICS, type TextVariant } from './theme-tokens.generated'

const VARIANTS = Object.keys(VARIANT_METRICS) as TextVariant[]

interface VariantPin {
  fontSize: number
  lineHeight: number
  ios: { fontFamily: string; fontWeight: string }
  android: { fontFamily: string; fontWeight: string }
}

const IOS_BOOK = { fontFamily: 'Basel Grotesk', fontWeight: '400' }
const IOS_MEDIUM = { fontFamily: 'Basel Grotesk', fontWeight: '500' }
const ANDROID_BOOK = { fontFamily: 'Basel-Grotesk-Book', fontWeight: '400' }
const ANDROID_MEDIUM = { fontFamily: 'Basel-Grotesk-Medium', fontWeight: '500' }
const MONO = { fontFamily: 'InputMono-Regular', fontWeight: '400' }

/**
 * The measured legacy native ramp (non-CJK locales — `smallFont: false`):
 * every size is the web size +1. The remaining scaled line-heights (the
 * buttonLabels) are computed from the adjusted size, as raw JS floats;
 * fixed-px line-heights are shared with web and do not gain the +1.
 */
const NATIVE_RAMP: Record<TextVariant, VariantPin> = {
  heading1: { fontSize: 53, lineHeight: 50, ios: IOS_BOOK, android: ANDROID_BOOK },
  heading2: { fontSize: 37, lineHeight: 40, ios: IOS_BOOK, android: ANDROID_BOOK },
  heading3: { fontSize: 25, lineHeight: 28, ios: IOS_BOOK, android: ANDROID_BOOK },
  subheading1: { fontSize: 19, lineHeight: 24, ios: IOS_BOOK, android: ANDROID_BOOK },
  subheading2: { fontSize: 17, lineHeight: 20, ios: IOS_BOOK, android: ANDROID_BOOK },
  body1: { fontSize: 19, lineHeight: 24, ios: IOS_BOOK, android: ANDROID_BOOK },
  body2: { fontSize: 17, lineHeight: 22, ios: IOS_BOOK, android: ANDROID_BOOK },
  body3: { fontSize: 15, lineHeight: 18, ios: IOS_BOOK, android: ANDROID_BOOK },
  body4: { fontSize: 13, lineHeight: 16, ios: IOS_BOOK, android: ANDROID_BOOK },
  body5: { fontSize: 11, lineHeight: 12, ios: IOS_BOOK, android: ANDROID_BOOK },
  buttonLabel1: { fontSize: 19, lineHeight: 19 * 1.15, ios: IOS_MEDIUM, android: ANDROID_MEDIUM },
  buttonLabel2: { fontSize: 17, lineHeight: 17 * 1.15, ios: IOS_MEDIUM, android: ANDROID_MEDIUM },
  buttonLabel3: { fontSize: 15, lineHeight: 15 * 1.15, ios: IOS_MEDIUM, android: ANDROID_MEDIUM },
  buttonLabel4: { fontSize: 13, lineHeight: 13 * 1.15, ios: IOS_MEDIUM, android: ANDROID_MEDIUM },
  monospace: { fontSize: 13, lineHeight: 16, ios: MONO, android: MONO },
}

describe('native variant ramp (smallFont: false — the measured legacy device column)', () => {
  it.each(VARIANTS)('%s renders the legacy native metrics and platform Basel font', (variant) => {
    const pin = NATIVE_RAMP[variant]
    const font = nativeVariantFont({ variant, smallFont: false })
    expect({ fontSize: font.fontSize, lineHeight: font.lineHeight }).toEqual({
      fontSize: pin.fontSize,
      lineHeight: pin.lineHeight,
    })
    expect(nativePlatformFont({ family: font.family, weight: font.fontWeight, platform: 'ios' })).toEqual(pin.ios)
    expect(nativePlatformFont({ family: font.family, weight: font.fontWeight, platform: 'android' })).toEqual(
      pin.android,
    )
  })
})

describe('native variant ramp (smallFont: true — CJK locales)', () => {
  it.each(VARIANTS)('%s equals the web ramp sizes (adjustedSize is the identity)', (variant) => {
    const font = nativeVariantFont({ variant, smallFont: true })
    const web = VARIANT_METRICS[variant]
    expect(font.fontSize).toBe(web.fontSize)
    // The generated web mirror rounds (28.8); native Tamagui emits the raw
    // float (24 * 1.2) — measured. Compare at rounding resolution.
    expect(font.lineHeight).toBeCloseTo(web.lineHeight, 6)
    expect(font.family).toBe(web.family)
  })
})

/**
 * Which font-relative lineHeight tokens are FIXED px in fonts.ts (measured:
 * legacy native emits them verbatim while every fontSize gains +1). The
 * smallFont:true drift check below cannot tell `{fixed}` from `{scale}` —
 * `adjustedSize` is the identity there — so this set is what lets the
 * smallFont:false check catch a fixed↔scaled transcription regression.
 */
const FIXED_LINE_HEIGHT_TOKENS: Readonly<Record<string, ReadonlySet<string>>> = {
  heading: new Set(['small', 'medium', 'true', 'large']), // heading3: 28, heading2: 40, heading1: 50
  subHeading: new Set(['small', 'large', 'true']), // subheading2: 20, subheading1: 24
  body: new Set(['nano', 'micro', 'small', 'medium', 'true', 'large']), // 12, 16, 18, 22, 22, 24
  button: new Set(), // buttonLabels all scale (× 1.15)
  monospace: new Set(['micro', 'small', 'medium', 'large', 'true']), // 16, 18, 22, 24, 16
}

describe('transcription drift guard against the generated fonts.ts mirror', () => {
  it('font-token size/lineHeight tables equal FONT_DEFINITIONS in the smallFont column', () => {
    for (const [fontToken, definition] of Object.entries(FONT_DEFINITIONS)) {
      for (const [name, webSize] of Object.entries(definition.sizes)) {
        expect(
          resolveNativeFontMetric({ value: `$${name}`, fontToken, kind: 'sizes', smallFont: true }),
          `${fontToken} sizes.${name}`,
        ).toBe(webSize)
      }
      for (const [name, webLineHeight] of Object.entries(definition.lineHeights)) {
        expect(
          resolveNativeFontMetric({ value: `$${name}`, fontToken, kind: 'lineHeights', smallFont: true }),
          `${fontToken} lineHeights.${name}`,
        ).toBeCloseTo(webLineHeight, 6)
      }
      expect(nativeFamilyForFontToken(fontToken)).toBe(definition.family)
    }
  })

  it('smallFont:false column: every size gains +1 while FIXED lineHeights keep the web px verbatim (measured)', () => {
    // Legacy fonts.ts never adjusts a fixed lineHeight (heading2 renders
    // 37/40, body4 13/16 — measured), while scaled ones recompute from the
    // ADJUSTED size. The smallFont:true check above passes either way for a
    // token whose `{fixed}`/`{scale}` marking is wrong; this column is where
    // that regression fails.
    for (const [fontToken, definition] of Object.entries(FONT_DEFINITIONS)) {
      for (const [name, webSize] of Object.entries(definition.sizes)) {
        expect(
          resolveNativeFontMetric({ value: `$${name}`, fontToken, kind: 'sizes', smallFont: false }),
          `${fontToken} sizes.${name}`,
        ).toBe(webSize + 1)
      }
      for (const [name, webLineHeight] of Object.entries(definition.lineHeights)) {
        const webSize = definition.sizes[name]
        expect(webSize, `${fontToken} sizes.${name} exists`).toBeDefined()
        const expected =
          FIXED_LINE_HEIGHT_TOKENS[fontToken]?.has(name) === true || webSize === undefined
            ? webLineHeight
            : (webSize + 1) * (webLineHeight / webSize)
        expect(
          resolveNativeFontMetric({ value: `$${name}`, fontToken, kind: 'lineHeights', smallFont: false }),
          `${fontToken} lineHeights.${name}`,
        ).toBeCloseTo(expected, 6)
      }
    }
  })
})

describe('font-relative token resolution (native tables)', () => {
  it('applies adjustedSize to token sizes while fixed line-heights stay shared with web', () => {
    // Native bodyFont.size.large = adjustedSize(18) = 19, so the +1 still
    // applies to the SIZE; body1's line-height is now a shared fixed 24.
    expect(resolveNativeFontMetric({ value: '$large', fontToken: 'body', kind: 'sizes', smallFont: false })).toBe(19)
    expect(resolveNativeFontMetric({ value: '$large', fontToken: 'body', kind: 'lineHeights', smallFont: false })).toBe(
      24,
    )
  })

  it('resolves variant metrics against the element font context, like the className lane', () => {
    // variant body2 ($medium) re-keyed to the heading font context → heading2 metrics.
    expect(nativeVariantMetric({ variant: 'body2', fontToken: 'heading', kind: 'sizes', smallFont: false })).toBe(37)
    // Falls back to the variant's own metrics when the context font lacks the token.
    expect(nativeVariantMetric({ variant: 'body5', fontToken: 'heading', kind: 'sizes', smallFont: false })).toBe(11)
  })

  it('throws on unknown tokens, exactly like the className lane', () => {
    expect(() =>
      resolveNativeFontMetric({ value: '$bogus', fontToken: 'body', kind: 'sizes', smallFont: false }),
    ).toThrow('unknown fontSize token')
  })
})

describe('nativePlatformFont face selection', () => {
  it("Android re-keys a book-family '500' onto the Medium file (the fonts.ts face map)", () => {
    expect(nativePlatformFont({ family: 'book', weight: '500', platform: 'android' })).toEqual({
      fontFamily: 'Basel-Grotesk-Medium',
      fontWeight: '500',
    })
  })

  it('Android keeps non-face weights on the family file, like legacy Tamagui', () => {
    expect(nativePlatformFont({ family: 'book', weight: 'bold', platform: 'android' })).toEqual({
      fontFamily: 'Basel-Grotesk-Book',
      fontWeight: 'bold',
    })
  })

  it("the Android face swap is one-directional: a medium-family '400' keeps the Medium FILE (measured legacy)", () => {
    // fonts.ts attaches its `face` map only to the book-family fonts —
    // `buttonFont` has none — so legacy Android renders a buttonLabel with
    // explicit fontWeight '400'/400 on Basel-Grotesk-Medium with the weight
    // kept in style, while legacy iOS keeps the embedded family name and
    // CoreText drops to the Book face. The platform asymmetry is legacy
    // behavior, deliberately replicated (do NOT add a medium→book re-key).
    expect(nativePlatformFont({ family: 'medium', weight: '400', platform: 'android' })).toEqual({
      fontFamily: 'Basel-Grotesk-Medium',
      fontWeight: '400',
    })
    expect(nativePlatformFont({ family: 'medium', weight: 400, platform: 'android' })).toEqual({
      fontFamily: 'Basel-Grotesk-Medium',
      fontWeight: 400,
    })
    expect(nativePlatformFont({ family: 'medium', weight: '400', platform: 'ios' })).toEqual({
      fontFamily: 'Basel Grotesk',
      fontWeight: '400',
    })
  })

  it('numeric app weights (485/535) pass through with no face swap, like legacy Tamagui (measured)', () => {
    // Legacy native Tamagui hands RN the raw number and keeps the variant's
    // family: Android stays on the variant's font FILE (no Book→Medium
    // re-key), iOS keeps the embedded name and CoreText picks the nearest
    // face at draw time.
    expect(nativePlatformFont({ family: 'book', weight: 535, platform: 'android' })).toEqual({
      fontFamily: 'Basel-Grotesk-Book',
      fontWeight: 535,
    })
    expect(nativePlatformFont({ family: 'medium', weight: 535, platform: 'android' })).toEqual({
      fontFamily: 'Basel-Grotesk-Medium',
      fontWeight: 535,
    })
    expect(nativePlatformFont({ family: 'book', weight: 485, platform: 'ios' })).toEqual({
      fontFamily: 'Basel Grotesk',
      fontWeight: 485,
    })
  })

  it('iOS always addresses the embedded family name — the weight picks the face', () => {
    expect(nativePlatformFont({ family: 'book', weight: '500', platform: 'ios' })).toEqual({
      fontFamily: 'Basel Grotesk',
      fontWeight: '500',
    })
  })

  it('a family with no weight in play emits fontFamily only (a fontFamily-only pool)', () => {
    expect(nativePlatformFont({ family: 'book', weight: undefined, platform: 'android' })).toEqual({
      fontFamily: 'Basel-Grotesk-Book',
    })
  })
})

/**
 * fonts.ts variant-level `maxFontSizeMultiplier` (INFRA-3783): without this,
 * a converted native Text with no explicit `allowFontScaling`/
 * `maxFontSizeMultiplier` prop scales unclamped with the device's Dynamic
 * Type setting instead of matching legacy's per-variant cap.
 */
const MAX_FONT_SIZE_MULTIPLIER: Record<TextVariant, number> = {
  heading1: 1.2,
  heading2: 1.2,
  heading3: 1.2,
  subheading1: 1.4,
  subheading2: 1.4,
  body1: 1.4,
  body2: 1.4,
  body3: 1.4,
  body4: 1.4,
  body5: 1.4,
  buttonLabel1: 1.2,
  buttonLabel2: 1.2,
  buttonLabel3: 1.2,
  buttonLabel4: 1.2,
  monospace: 1.2,
}

describe('nativeVariantMaxFontSizeMultiplier (INFRA-3783)', () => {
  it.each(VARIANTS)('%s matches fonts.ts maxFontSizeMultiplier', (variant) => {
    expect(nativeVariantMaxFontSizeMultiplier(variant)).toBe(MAX_FONT_SIZE_MULTIPLIER[variant])
  })

  it('returns undefined for an unknown variant instead of throwing', () => {
    expect(nativeVariantMaxFontSizeMultiplier('not-a-real-variant')).toBeUndefined()
  })
})
