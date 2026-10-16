/**
 * The legacy NATIVE type ramp for the TextCompat style lane (INFRA-3461),
 * transcribed from `packages/ui/src/theme/fonts.ts` resolved for native
 * (`isWebPlatform`/`isWebApp` false). Kept local on purpose: mycelium must
 * never depend on `packages/ui` (the ButtonCompat.native.tsx precedent), and
 * the generated `VARIANT_METRICS` mirror deliberately carries the WEB values
 * the className lane compiles.
 *
 * Two facts make the native ramp a different table rather than a re-read of
 * `VARIANT_METRICS`:
 *  - `adjustedSize`: on native, non-CJK locales render every variant 1px
 *    larger (`needsSmallFont` is false). The still-multiplied line-heights
 *    (`fontSize * 1.15` for buttonLabels) are computed FROM that adjusted
 *    size, so they resolve larger than web; the fixed-px line-heights are
 *    shared with web and only the font size differs.
 *  - Weights: RN expresses the app's 485/535 web weights through the font
 *    FILES; native Tamagui resolves `$book`/`$medium` to '400'/'500'.
 *
 * The `smallFont: true` column is identical to the web ramp by construction
 * (`adjustedSize` is the identity there) — pinned against the generated
 * `VARIANT_METRICS`/`FONT_DEFINITIONS` mirror in `native-font.test.ts`, so a
 * fonts.ts change that regenerates the mirror fails this transcription loudly.
 *
 * fonts.ts variant-level `letterSpacing` (headings carry -2%) stays OUTSIDE
 * this native path — pre-existing behavior, deliberately unchanged here.
 * `maxFontSizeMultiplier` is now resolved here too (INFRA-3783):
 * `nativeVariantMaxFontSizeMultiplier` below, a top-level RN `Text` prop
 * rather than a style key, so it is exposed as its own function instead of
 * folding into `NativeVariantFont`.
 */
import { FONT_DEFINITIONS, VARIANT_METRICS } from './theme-tokens.generated'
import { VARIANT_SIZE_TOKEN } from './typography-classes'

export type NativeFontPlatform = 'ios' | 'android'
export type NativeFontFamilyKey = 'book' | 'medium' | 'mono'

/** What the style lane needs to know about the device (see native-font-environment.*). */
export interface NativeFontEnvironment {
  platform: NativeFontPlatform
  /** fonts.ts `needsSmallFont()`: CJK locales skip the native +1px adjustment. */
  smallFont: boolean
}

/** fonts.ts BOOK_WEIGHT / MEDIUM_WEIGHT — the native weights (web is 485/535). */
export const NATIVE_BOOK_WEIGHT = '400'
export const NATIVE_MEDIUM_WEIGHT = '500'

/**
 * fonts.ts `fontFamilyByPlatform` — RN font naming is platform-split: iOS
 * addresses the family name embedded in the font file (both Basel faces embed
 * "Basel Grotesk"; the weight picks the face), Android addresses the FILE name
 * (react-native-asset links apps/mobile/src/assets/fonts/*.otf). The same
 * split ButtonCompat.native.tsx and SegmentedControl.native.tsx already ship.
 */
const NATIVE_FONT_FAMILY: Readonly<Record<NativeFontPlatform, Readonly<Record<NativeFontFamilyKey, string>>>> = {
  ios: { book: 'Basel Grotesk', medium: 'Basel Grotesk', mono: 'InputMono-Regular' },
  android: { book: 'Basel-Grotesk-Book', medium: 'Basel-Grotesk-Medium', mono: 'InputMono-Regular' },
}

/** fonts.ts `adjustedSize`: +1px on native except for CJK locales (`needsSmallFont`). */
function adjustedSize(fontSize: number, smallFont: boolean): number {
  return smallFont ? fontSize : fontSize + 1
}

export interface NativeVariantFont {
  fontSize: number
  lineHeight: number
  family: NativeFontFamilyKey
  /** '400' | '500' — string, exactly as native Tamagui resolves `$book`/`$medium`. */
  fontWeight: string
}

interface NativeVariantSpec {
  base: number
  /** fonts.ts lineHeight rule: a multiple of the ADJUSTED size, or a fixed px value. */
  lineHeight: { scale: number } | { fixed: number }
  /** fonts.ts variant-level `maxFontSizeMultiplier` — see nativeVariantMaxFontSizeMultiplier. */
  maxFontSizeMultiplier: number
}

/** fonts.ts `fonts.*` base sizes, line-height rules, and maxFontSizeMultiplier (native branch). */
const NATIVE_VARIANT_SPECS: Readonly<Record<string, NativeVariantSpec>> = {
  heading1: { base: 52, lineHeight: { fixed: 50 }, maxFontSizeMultiplier: 1.2 },
  heading2: { base: 36, lineHeight: { fixed: 40 }, maxFontSizeMultiplier: 1.2 },
  heading3: { base: 24, lineHeight: { fixed: 28 }, maxFontSizeMultiplier: 1.2 },
  subheading1: { base: 18, lineHeight: { fixed: 24 }, maxFontSizeMultiplier: 1.4 },
  subheading2: { base: 16, lineHeight: { fixed: 20 }, maxFontSizeMultiplier: 1.4 },
  body1: { base: 18, lineHeight: { fixed: 24 }, maxFontSizeMultiplier: 1.4 },
  body2: { base: 16, lineHeight: { fixed: 22 }, maxFontSizeMultiplier: 1.4 },
  body3: { base: 14, lineHeight: { fixed: 18 }, maxFontSizeMultiplier: 1.4 },
  body4: { base: 12, lineHeight: { fixed: 16 }, maxFontSizeMultiplier: 1.4 },
  body5: { base: 10, lineHeight: { fixed: 12 }, maxFontSizeMultiplier: 1.4 },
  buttonLabel1: { base: 18, lineHeight: { scale: 1.15 }, maxFontSizeMultiplier: 1.2 },
  buttonLabel2: { base: 16, lineHeight: { scale: 1.15 }, maxFontSizeMultiplier: 1.2 },
  buttonLabel3: { base: 14, lineHeight: { scale: 1.15 }, maxFontSizeMultiplier: 1.2 },
  buttonLabel4: { base: 12, lineHeight: { scale: 1.15 }, maxFontSizeMultiplier: 1.2 },
  monospace: { base: 12, lineHeight: { fixed: 16 }, maxFontSizeMultiplier: 1.2 },
}

/**
 * fonts.ts variant-level `maxFontSizeMultiplier` (INFRA-3783): forwarded as a
 * top-level RN `Text` prop, not a style key, so it is read straight from the
 * spec table rather than through `nativeVariantFont` (which mixes in the
 * smallFont-dependent `adjustedSize` this multiplier has nothing to do with).
 * Returns `undefined` for an unknown variant — the caller already throws on
 * that via `nativeVariantFont`'s own font-metrics resolution.
 */
export function nativeVariantMaxFontSizeMultiplier(variant: string): number | undefined {
  return NATIVE_VARIANT_SPECS[variant]?.maxFontSizeMultiplier
}

/** Map the generated mirror's WEB weight (485/535) to the native weight string. */
function nativeWeightForWebWeight(webWeight: number): string {
  return webWeight === 535 ? NATIVE_MEDIUM_WEIGHT : NATIVE_BOOK_WEIGHT
}

/** Narrow an arbitrary variant string to a key of the generated mirror. */
function isGeneratedVariant(variant: string): variant is keyof typeof VARIANT_METRICS {
  return variant in VARIANT_METRICS
}

/**
 * The native metrics one variant renders — fonts.ts `fonts[variant]` with
 * `adjustedSize` applied, plus the family/weight the legacy variant sets.
 *
 * A variant must exist in BOTH `NATIVE_VARIANT_SPECS` (hand-transcribed) and
 * the generated `VARIANT_METRICS` mirror — nothing ties them at the type
 * level, so a miss throws here MID-RENDER; the transcription drift guard in
 * `native-font.test.ts` is what holds the two tables together.
 */
export function nativeVariantFont({ variant, smallFont }: { variant: string; smallFont: boolean }): NativeVariantFont {
  const spec = NATIVE_VARIANT_SPECS[variant]
  if (spec === undefined || !isGeneratedVariant(variant)) {
    throw new Error(`TextCompat: unknown native variant "${variant}"`)
  }
  const metrics = VARIANT_METRICS[variant]
  const fontSize = adjustedSize(spec.base, smallFont)
  return {
    fontSize,
    lineHeight: 'scale' in spec.lineHeight ? fontSize * spec.lineHeight.scale : spec.lineHeight.fixed,
    family: metrics.family,
    fontWeight: nativeWeightForWebWeight(metrics.fontWeight),
  }
}

/**
 * fonts.ts createFont size/lineHeight maps: which variant's metrics each
 * font-relative token (`$small`, `$large`, …) reads, per font token.
 */
const NATIVE_FONT_TOKEN_VARIANTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  heading: { small: 'heading3', medium: 'heading2', true: 'heading2', large: 'heading1' },
  subHeading: { small: 'subheading2', large: 'subheading1', true: 'subheading1' },
  body: { nano: 'body5', micro: 'body4', small: 'body3', medium: 'body2', true: 'body2', large: 'body1' },
  button: {
    micro: 'buttonLabel4',
    small: 'buttonLabel3',
    medium: 'buttonLabel2',
    large: 'buttonLabel1',
    true: 'buttonLabel2',
  },
  monospace: { micro: 'body4', small: 'body3', medium: 'body2', large: 'body1', true: 'monospace' },
}

/** The `NativeFontFamilyKey` a font token renders ('$body' context → 'book'). */
export function nativeFamilyForFontToken(fontToken: string): NativeFontFamilyKey {
  return FONT_DEFINITIONS[fontToken]?.family ?? 'book'
}

/**
 * Native twin of `resolveFontMetric` (typography-classes.ts): font-relative
 * token → px against the NATIVE tables, falling back to the variant-named
 * tokens. Throws on unknown tokens, exactly like the className lane.
 */
export function resolveNativeFontMetric({
  value,
  fontToken,
  kind,
  smallFont,
}: {
  value: string
  fontToken: string
  kind: 'sizes' | 'lineHeights'
  smallFont: boolean
}): number {
  const name = value.slice(1)
  const variantForToken = NATIVE_FONT_TOKEN_VARIANTS[fontToken]?.[name]
  if (variantForToken !== undefined) {
    const metrics = nativeVariantFont({ variant: variantForToken, smallFont })
    return kind === 'sizes' ? metrics.fontSize : metrics.lineHeight
  }
  if (name in NATIVE_VARIANT_SPECS) {
    const metrics = nativeVariantFont({ variant: name, smallFont })
    return kind === 'sizes' ? metrics.fontSize : metrics.lineHeight
  }
  throw new Error(
    `TextCompat: unknown ${kind === 'sizes' ? 'fontSize' : 'lineHeight'} token "${value}" for font "$${fontToken}"`,
  )
}

/**
 * Native twin of `variantMetric` (typography-classes.ts): a variant's
 * size/lineHeight token resolved against the element's global font context,
 * falling back to the variant's own native metrics when the context font
 * lacks the token — the same re-keying the className lane applies.
 */
export function nativeVariantMetric({
  variant,
  fontToken,
  kind,
  smallFont,
}: {
  variant: string
  fontToken: string
  kind: 'sizes' | 'lineHeights'
  smallFont: boolean
}): number {
  const sizeToken = VARIANT_SIZE_TOKEN[variant]
  const own = nativeVariantFont({ variant, smallFont })
  if (sizeToken === undefined) {
    return kind === 'sizes' ? own.fontSize : own.lineHeight
  }
  const contextVariant = NATIVE_FONT_TOKEN_VARIANTS[fontToken]?.[sizeToken.slice(1)]
  if (contextVariant === undefined) {
    return kind === 'sizes' ? own.fontSize : own.lineHeight
  }
  const metrics = nativeVariantFont({ variant: contextVariant, smallFont })
  return kind === 'sizes' ? metrics.fontSize : metrics.lineHeight
}

export interface NativePlatformFont {
  fontFamily: string
  /** Absent when no weight is in play (e.g. a pool that only sets `fontFamily`). */
  fontWeight?: string | number
}

/**
 * Resolve a logical (family, weight) pair to the platform font, mirroring what
 * native Tamagui emits for the legacy Text (measured via the parity harness):
 *
 *  - iOS: the embedded family name plus the weight — CoreText picks the face.
 *  - Android: the weight picks the font FILE, replicating the fonts.ts `face`
 *    map — and that swap is ONE-DIRECTIONAL by construction: fonts.ts attaches
 *    `face` only to the book-family fonts ('400' → Book file, '500' → Medium
 *    file); `buttonFont` carries none, so legacy renders a medium-family
 *    variant with explicit fontWeight '400' on the Medium FILE, weight kept
 *    (measured), while iOS CoreText drops to the Book face — a legacy
 *    platform asymmetry deliberately replicated, not corrected. All other
 *    weights keep the family's own file (Tamagui keeps the weight too).
 *    Legacy Tamagui DELETES the weight after a face swap; the leg re-asserts
 *    the face's nominal weight instead so the className lane's web-ramp
 *    `[font-weight:485]` (in the bundle via an incidental literal — see
 *    FONT_WEIGHT_SCANNER_FRAGILITY_REASON in the tailwind text ledger) can
 *    never override it in RN's style merge; '400'/'500' match the files'
 *    rendering, so the result is what legacy devices draw.
 */
export function nativePlatformFont({
  family,
  weight,
  platform,
}: {
  family: NativeFontFamilyKey
  weight: string | number | undefined
  platform: NativeFontPlatform
}): NativePlatformFont {
  if (platform === 'android' && family === 'book' && String(weight) === NATIVE_MEDIUM_WEIGHT) {
    return { fontFamily: NATIVE_FONT_FAMILY.android.medium, fontWeight: weight }
  }
  return weight === undefined
    ? { fontFamily: NATIVE_FONT_FAMILY[platform][family] }
    : { fontFamily: NATIVE_FONT_FAMILY[platform][family], fontWeight: weight }
}
