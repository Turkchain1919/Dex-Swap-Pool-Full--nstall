/**
 * Platformless base of the legacy font machinery port (see
 * `./font-variant-shared` for provenance). Only `getFontStylesForVariant`
 * is platform-split; this base resolves the deterministic web column —
 * mirroring `native-font-environment.ts` — so typecheck and jsdom test
 * configs that resolve the base leg get real values, and web bundlers that
 * resolve `.web.*` first get the identical implementation.
 */
export {
  ALL_FONT_VARIANT_TOKENS,
  getTextVariantKey,
  webFontStylesForVariant as getFontStylesForVariant,
} from './font-variant-shared'
export type { ResolvedFontStyle, TextVariantKey } from './font-variant-shared'
