/**
 * Web leg of the platform split — identical to the platformless base (see its
 * header): `getFontStylesForVariant` resolves the legacy WEB column (the
 * generated `VARIANT_METRICS` mirror, the verbatim Basel stack, fonts-table
 * weights).
 *
 * Intentionally NOT the usual throwing platformless-base convention: the base
 * here is a real web-shared implementation, so this leg re-exports the same
 * functions — the platform-legs assertions in `font-variant.test.ts` pin the
 * identity.
 */
export {
  ALL_FONT_VARIANT_TOKENS,
  getTextVariantKey,
  webFontStylesForVariant as getFontStylesForVariant,
} from './font-variant-shared'
export type { ResolvedFontStyle, TextVariantKey } from './font-variant-shared'
