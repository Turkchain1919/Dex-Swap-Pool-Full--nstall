/**
 * Drift guard for the ported legacy font machinery (`ui/src/theme/fonts.ts`
 * `getTextVariantKey` / `getFontStylesForVariant` / `ALL_FONT_VARIANT_TOKENS`).
 * The expected web values are transcribed from the legacy WEB resolution as
 * independent literals — deliberately not derived from `VARIANT_METRICS` or
 * the implementation, so either side drifting fails loudly (the INFRA-3461
 * replicated-constants pattern; mycelium must never import `packages/ui`).
 *
 * SCOPE: this file runs under `packages/mycelium/vitest.config.ts` (jsdom,
 * `.web.*` resolved first), so the native leg resolves the deterministic
 * web-equivalent environment column (iOS naming, CJK-equal sizes — see
 * `native-font-environment.ts`). The adjusted on-device ramp the native leg
 * composes is pinned per platform in `native-font.test.ts`.
 */
import type { FontVariantToken } from '@universe/tailwind/types'
import { describe, expect, it } from 'vitest'
import * as nativeLeg from './font-variant.native'
// Explicit .ts extension: the mycelium vitest config resolves `.web.*` first,
// which would silently swap the platformless base leg for the web leg here.
import * as base from './font-variant.ts'
import * as web from './font-variant.web'

const WEB_BASEL =
  'Basel, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const WEB_MONO = 'InputMono-Regular'

/**
 * The legacy web resolution per variant, as independent literals: fonts.ts
 * sizes with identity adjustment on web, fonts-table nominal weights
 * ('400'/'500' — the 485/535 web-app weights belong to the className lane,
 * never to `ResolvedFontStyle`), the verbatim Basel stack, and the raw mono
 * file name (the documented legacy fall-through for the mono family).
 */
const LEGACY_WEB_RESOLVED: Record<string, ReturnType<typeof web.getFontStylesForVariant>> = {
  heading1: { fontSize: 52, lineHeight: 50, family: WEB_BASEL, fontWeight: '400', letterSpacing: '-2%' },
  heading2: { fontSize: 36, lineHeight: 40, family: WEB_BASEL, fontWeight: '400', letterSpacing: '-1%' },
  heading3: { fontSize: 24, lineHeight: 28, family: WEB_BASEL, fontWeight: '400', letterSpacing: '-0.5%' },
  subheading1: { fontSize: 18, lineHeight: 24, family: WEB_BASEL, fontWeight: '400', letterSpacing: undefined },
  subheading2: { fontSize: 16, lineHeight: 20, family: WEB_BASEL, fontWeight: '400', letterSpacing: undefined },
  body1: { fontSize: 18, lineHeight: 24, family: WEB_BASEL, fontWeight: '400', letterSpacing: undefined },
  body2: { fontSize: 16, lineHeight: 22, family: WEB_BASEL, fontWeight: '400', letterSpacing: undefined },
  body3: { fontSize: 14, lineHeight: 18, family: WEB_BASEL, fontWeight: '400', letterSpacing: undefined },
  body4: { fontSize: 12, lineHeight: 16, family: WEB_BASEL, fontWeight: '400', letterSpacing: undefined },
  body5: { fontSize: 10, lineHeight: 12, family: WEB_BASEL, fontWeight: '400', letterSpacing: undefined },
  buttonLabel1: { fontSize: 18, lineHeight: 20.7, family: WEB_BASEL, fontWeight: '500', letterSpacing: undefined },
  buttonLabel2: { fontSize: 16, lineHeight: 18.4, family: WEB_BASEL, fontWeight: '500', letterSpacing: undefined },
  buttonLabel3: { fontSize: 14, lineHeight: 16.1, family: WEB_BASEL, fontWeight: '500', letterSpacing: undefined },
  buttonLabel4: { fontSize: 12, lineHeight: 13.8, family: WEB_BASEL, fontWeight: '500', letterSpacing: undefined },
  monospace: { fontSize: 12, lineHeight: 16, family: WEB_MONO, fontWeight: '400', letterSpacing: undefined },
}

/** The legacy token list, in the legacy fonts-table insertion order. */
const LEGACY_TOKENS = [
  '$heading1',
  '$heading2',
  '$heading3',
  '$subheading1',
  '$subheading2',
  '$body1',
  '$body2',
  '$body3',
  '$body4',
  '$body5',
  '$buttonLabel1',
  '$buttonLabel2',
  '$buttonLabel3',
  '$buttonLabel4',
  '$monospace',
] as const

describe('getFontStylesForVariant (web legs)', () => {
  it.each(LEGACY_TOKENS)('%s resolves the legacy web font style', (token) => {
    const expected = LEGACY_WEB_RESOLVED[token.slice(1)]
    expect(web.getFontStylesForVariant(token)).toEqual(expected)
    expect(base.getFontStylesForVariant(token)).toEqual(expected)
  })

  it('resolves out-of-set tokens through the legacy fallback variant', () => {
    expect(web.getFontStylesForVariant('$notAVariant' as FontVariantToken)).toEqual(LEGACY_WEB_RESOLVED['heading2'])
  })
})

describe('getFontStylesForVariant (native leg under the deterministic web-equivalent environment)', () => {
  it.each(LEGACY_TOKENS)('%s resolves web-equal metrics with the iOS font naming', (token) => {
    const resolved = nativeLeg.getFontStylesForVariant(token)
    const webResolved = LEGACY_WEB_RESOLVED[token.slice(1)]!
    expect(resolved.fontSize).toBe(webResolved.fontSize)
    // The native leg computes scaled line-heights as raw JS floats (as native
    // Tamagui does), while the web mirror carries the rendered literals — the
    // same value up to float noise.
    expect(resolved.lineHeight).toBeCloseTo(webResolved.lineHeight, 10)
    expect(resolved.fontWeight).toBe(webResolved.fontWeight)
    expect(resolved.letterSpacing).toBe(webResolved.letterSpacing)
    expect(resolved.family).toBe(token === '$monospace' ? 'InputMono-Regular' : 'Basel Grotesk')
  })
})

describe('getTextVariantKey', () => {
  it.each(LEGACY_TOKENS)('%s strips the prefix', (token) => {
    expect(base.getTextVariantKey(token)).toBe(token.slice(1))
  })

  it('falls back to the legacy default for out-of-set tokens', () => {
    expect(base.getTextVariantKey('$notAVariant' as FontVariantToken)).toBe('heading2')
  })
})

describe('ALL_FONT_VARIANT_TOKENS', () => {
  it('lists every legacy token in the legacy order', () => {
    expect(base.ALL_FONT_VARIANT_TOKENS).toEqual([...LEGACY_TOKENS])
  })
})

describe('platform legs', () => {
  it('export the same runtime surface', () => {
    const names = (mod: object): string[] => Object.keys(mod).sort()
    expect(names(web)).toEqual(names(base))
    expect(names(nativeLeg)).toEqual(names(base))
  })

  it('web leg and base leg resolve identically (shared implementation)', () => {
    expect(web.getFontStylesForVariant).toBe(base.getFontStylesForVariant)
    expect(web.getTextVariantKey).toBe(base.getTextVariantKey)
  })
})
