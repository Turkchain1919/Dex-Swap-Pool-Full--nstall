/**
 * The NATIVE column of the ui font table, derived through the text-compat
 * native font machinery (`./text-compat/native-font.ts`, itself drift-guarded
 * against the generated ui mirror) so this table and `TextCompat.native` can
 * never disagree about what a variant renders on device.
 *
 * The device environment is INJECTED, not read at module scope: off native
 * `nativeFontEnvironment()` hard-returns the iOS/`smallFont: true` column, the
 * one equal to web by construction, so a test that only called it could never
 * see the ramp.
 *
 * Only `fontSize`, `lineHeight` and `family` are re-derived. `fontWeight`,
 * `maxFontSizeMultiplier` and `letterSpacing` carry through from the web table
 * because ui does not diverge on them — `fonts` hard-codes '400'/'500' on both
 * platforms (the `isWebApp` 485/535 gating is on the separate `defaultWeights`
 * export) and the native font path leaves the other two out. Re-deriving any
 * of the three would invent a divergence ui does not have.
 */
import { type FontVariantName, fonts as webFonts, type ResolvedFontToken } from './font-tokens.web'
import { type NativeFontEnvironment, nativePlatformFont, nativeVariantFont } from './text-compat/native-font'

function nativeVariant(variant: FontVariantName, { platform, smallFont }: NativeFontEnvironment): ResolvedFontToken {
  const native = nativeVariantFont({ variant, smallFont })
  return {
    ...webFonts[variant],
    fontSize: native.fontSize,
    lineHeight: native.lineHeight,
    // `weight: undefined` on purpose: ui's `platformFontFamily` ignores weight,
    // so the android book+'500' file swap `nativePlatformFont` also implements
    // must not fire here.
    family: nativePlatformFont({ family: native.family, weight: undefined, platform }).fontFamily,
  }
}

/**
 * The `fonts` table as `ui/src/theme` resolves it for `environment`. Spelled
 * out variant by variant rather than mapped so a variant added to the web leg
 * fails typecheck here instead of silently missing on native.
 *
 * @throws when a variant has no entry in the native ramp tables — a defect the
 * platform-legs suite catches, never a runtime condition.
 */
export function nativeFontsTable(
  environment: NativeFontEnvironment,
): Readonly<Record<FontVariantName, ResolvedFontToken>> {
  return {
    heading1: nativeVariant('heading1', environment),
    heading2: nativeVariant('heading2', environment),
    heading3: nativeVariant('heading3', environment),
    subheading1: nativeVariant('subheading1', environment),
    subheading2: nativeVariant('subheading2', environment),
    body1: nativeVariant('body1', environment),
    body2: nativeVariant('body2', environment),
    body3: nativeVariant('body3', environment),
    body4: nativeVariant('body4', environment),
    body5: nativeVariant('body5', environment),
    buttonLabel1: nativeVariant('buttonLabel1', environment),
    buttonLabel2: nativeVariant('buttonLabel2', environment),
    buttonLabel3: nativeVariant('buttonLabel3', environment),
    buttonLabel4: nativeVariant('buttonLabel4', environment),
    monospace: nativeVariant('monospace', environment),
  }
}
