/**
 * INFRA-3516: the native leg's theme-value narrowing. A `--unicon-N` token
 * that doesn't resolve to a hex must fall back to the static light palette
 * for the SAME index — deterministic and visible, never an invisible avatar.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { UNICON_COLORS } from './colors'
import { FALLBACK_UNICON_BG_OPACITY, resolveUniconBgOpacity, resolveUniconColor } from './native-theme'

describe('resolveUniconColor', () => {
  it('passes every REAL --color-unicon-N-* literal from @universe/tailwind through unchanged', () => {
    // The actual token file the native.css buckets resolve into — if a
    // palette edit lands in a form the narrowing rejects, this goes red
    // instead of the avatar silently diverting to the static fallback.
    const themeCss = readFileSync(join(__dirname, '..', '..', '..', 'tailwind', 'css', 'theme.css'), 'utf8')
    const tokens = [...themeCss.matchAll(/--color-unicon-(\d+)-(?:light|dark):\s*([^;]+);/g)].map((match) => ({
      index: Number(match[1]),
      value: (match[2] as string).trim(),
    }))
    expect(tokens).toHaveLength(20)
    for (const token of tokens) {
      expect(resolveUniconColor(token.value, token.index)).toBe(token.value)
    }
  })

  it('the BUCKET variables the native leg reads exist in native.css (light and dark), wired to the terminal literals', () => {
    // The component reads --unicon-N / --unicon-bg-opacity, not the
    // --color-unicon-* terminals — if a bucket declaration disappears from
    // native.css, every native avatar falls back with only a dev warning.
    const nativeCss = readFileSync(join(__dirname, '..', '..', '..', 'tailwind', 'native.css'), 'utf8')
    for (let index = 0; index < 10; index++) {
      expect(nativeCss).toMatch(new RegExp(`--unicon-${index}:\\s*var\\(--color-unicon-${index}-light\\)`))
      expect(nativeCss).toMatch(new RegExp(`--unicon-${index}:\\s*var\\(--color-unicon-${index}-dark\\)`))
    }
    const bgOpacityDeclarations = [...nativeCss.matchAll(/--unicon-bg-opacity:\s*([^;]+);/g)].map((match) =>
      (match[1] as string).trim(),
    )
    // One per theme bucket, each a usable opacity.
    expect(bgOpacityDeclarations).toHaveLength(2)
    for (const declaration of bgOpacityDeclarations) {
      expect(resolveUniconBgOpacity(declaration)).toBe(Number(declaration))
    }
  })

  it('passes the RN-parseable hex forms through unchanged (#RGB/#RGBA/#RRGGBB/#RRGGBBAA)', () => {
    expect(resolveUniconColor('#F50DB4', 0)).toBe('#F50DB4')
    expect(resolveUniconColor('#f50db4', 3)).toBe('#f50db4')
    expect(resolveUniconColor('#fff', 3)).toBe('#fff')
    expect(resolveUniconColor('#fff8', 3)).toBe('#fff8')
    expect(resolveUniconColor('#F50DB4CC', 3)).toBe('#F50DB4CC')
  })

  it.each([
    ['an unresolved var() reference', 'var(--color-unicon-3-light)'],
    ['undefined (uniwind store not wired)', undefined],
    ['a number', 0x123456],
    ['an rgb() value', 'rgb(245, 13, 180)'],
    ['a malformed 7-digit hex', '#F50DB44'],
    ['a malformed 5-digit hex', '#F50DB'],
  ])('falls back to the light palette at the same index for %s', (_label, value) => {
    expect(resolveUniconColor(value, 3)).toBe(UNICON_COLORS.light[3])
    expect(resolveUniconColor(value, 9)).toBe(UNICON_COLORS.light[9])
  })

  it('clamps an out-of-range index to slot 0 rather than returning undefined', () => {
    expect(resolveUniconColor(undefined, 99)).toBe(UNICON_COLORS.light[0])
  })
})

describe('resolveUniconBgOpacity', () => {
  it('accepts the theme buckets (0.1216 light / 0.1608 dark), number or string form', () => {
    expect(resolveUniconBgOpacity(0.1216)).toBe(0.1216)
    expect(resolveUniconBgOpacity(0.1608)).toBe(0.1608)
    expect(resolveUniconBgOpacity('0.1608')).toBe(0.1608)
  })

  it('falls back to the light bucket value for anything unusable', () => {
    for (const value of [undefined, 'var(--unicon-bg-opacity)', -1, 2, Number.NaN]) {
      expect(resolveUniconBgOpacity(value)).toBe(FALLBACK_UNICON_BG_OPACITY)
    }
  })

  it('rejects empty/whitespace strings (Number("") is 0, which would render a transparent circle)', () => {
    for (const value of ['', '   ', '\t\n']) {
      expect(resolveUniconBgOpacity(value)).toBe(FALLBACK_UNICON_BG_OPACITY)
    }
  })
})
