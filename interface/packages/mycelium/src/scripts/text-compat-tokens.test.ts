/**
 * Check-in-sync gate for `../text-compat/theme-tokens.generated.ts`,
 * `../text-compat/spore-text-colors.generated.css`, and its native-dialect
 * twin `spore-text-colors-native.generated.css`: re-derives the mirrors
 * from ui/src/theme on disk and compares them to the committed files — the
 * same work `generate-text-compat-tokens.mts --check` does, run through the
 * generator's own derive/render functions rather than a second copy
 * (`css-color-names.test.ts` precedent).
 *
 * This runs under `nx test @universe/mycelium`; `labs/workbench` (where the
 * generator lives) is not an nx project, so a check there would never gate
 * CI — and this exact mirror already rotted once, unnoticed, when ui/src
 * gained `chain_57073` (INFRA-3244).
 *
 * The CSS mirror is compared byte-for-byte. The TS mirror is compared
 * value-for-value because oxfmt rewraps the rendered module after generation,
 * so its bytes are not render-stable.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fonts, themes } from 'ui/src/theme'
import { describe, expect, it } from 'vitest'
import { THEME_COLOR_TOKENS, VARIANT_METRICS } from '../text-compat/theme-tokens.generated'
import {
  deriveFontDefinitions,
  deriveThemeColorTokens,
  deriveVariantMetrics,
  renderSporeTextColorsCss,
  renderSporeTextColorsNativeCss,
  type UiFontVariant,
} from './text-compat-tokens'

const CSS_FILE = path.join(__dirname, '..', 'text-compat', 'spore-text-colors.generated.css')
const NATIVE_CSS_FILE = path.join(__dirname, '..', 'text-compat', 'spore-text-colors-native.generated.css')

// vitest.config.ts resolves ui/src with the web platform legs and APP_ID=web,
// the same semantics the generator sets before importing the theme.
const light = themes.light as Record<string, string>
const dark = themes.dark as Record<string, string>

describe('text-compat mirrors ↔ ui/src/theme (generator --check)', () => {
  it('THEME_COLOR_TOKENS is exactly the ui theme colour table', () => {
    expect([...THEME_COLOR_TOKENS]).toEqual(deriveThemeColorTokens(light))
  })

  it('the committed --stext palette CSS is byte-identical to a fresh render', () => {
    expect(readFileSync(CSS_FILE, 'utf8')).toBe(renderSporeTextColorsCss(light, dark))
  })

  it('the committed native-dialect twin CSS is byte-identical to a fresh render', () => {
    expect(readFileSync(NATIVE_CSS_FILE, 'utf8')).toBe(renderSporeTextColorsNativeCss(light, dark))
  })

  it('VARIANT_METRICS matches a fresh derivation from ui fonts', () => {
    expect(VARIANT_METRICS).toEqual(deriveVariantMetrics(fonts as unknown as Record<string, UiFontVariant>))
  })
})

describe('the derivation refuses shapes that would shrink the mirror silently', () => {
  it('throws on an empty theme colour table', () => {
    expect(() => deriveThemeColorTokens({})).toThrow(/zero tokens/)
  })

  it('throws on an unmapped web font weight', () => {
    expect(() => deriveVariantMetrics({ heading1: { fontSize: 10, lineHeight: 12, fontWeight: '600' } })).toThrow(
      /Unmapped web font weight/,
    )
  })

  it('throws on an unmapped font token', () => {
    expect(() => deriveFontDefinitions({ display: { size: { small: 10 } } })).toThrow(/Unmapped font token/)
  })

  it('throws on a non-numeric font token value instead of writing NaN into the mirror', () => {
    expect(() => deriveFontDefinitions({ heading: { size: { small: 'not-a-number' } } })).toThrow(/non-numeric/)
  })

  it('throws when a light theme token has no dark twin, instead of rendering `undefined`', () => {
    expect(() => renderSporeTextColorsCss({ foo: '#fff', bar: '#000' }, { foo: '#111' })).toThrow(/bar/)
    expect(() => renderSporeTextColorsNativeCss({ foo: '#fff', bar: '#000' }, { foo: '#111' })).toThrow(/bar/)
  })
})
