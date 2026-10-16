import { describe, expect, it } from 'vitest'
import { FALLBACK_GLARE_COLOR, opacifyGlareColor, resolveGlareColor, varReference } from './glare-color'

describe('varReference', () => {
  it('extracts a one-level var() indirection (the native.css --surface1 shape)', () => {
    expect(varReference('var(--color-surface1-light)')).toBe('--color-surface1-light')
    expect(varReference(' var( --color-surface1-dark ) ')).toBe('--color-surface1-dark')
  })

  it('returns undefined for anything but a plain single var()', () => {
    expect(varReference('#131313')).toBeUndefined()
    expect(varReference('var(--a, #fff)')).toBeUndefined()
    expect(varReference('calc(var(--a) + 1px)')).toBeUndefined()
    expect(varReference(16)).toBeUndefined()
    expect(varReference(undefined)).toBeUndefined()
  })
})

describe('resolveGlareColor', () => {
  it('passes a simple 6-digit hex through', () => {
    expect(resolveGlareColor('#131313')).toBe('#131313')
    expect(resolveGlareColor('#ffffff')).toBe('#ffffff')
  })

  it.each([
    ['a shorthand hex (legacy length guard)', '#abc'],
    ['an 8-digit hex', '#13131300'],
    ['an rgba() color', 'rgba(19,19,19,1)'],
    ['a CSS keyword', 'white'],
    ['a malformed 7-char token (would throw in opacifyGlareColor)', '#13131z'],
    ['a numeric variable value', 16],
    ['undefined (variable not registered)', undefined],
  ])('falls back to white for %s', (_name, value) => {
    expect(resolveGlareColor(value)).toBe(FALLBACK_GLARE_COLOR)
  })

  it('never returns a value opacifyGlareColor rejects (fallback path cannot throw)', () => {
    for (const value of ['#13131z', '#1313131', 'var(--surface1)', '', null]) {
      expect(() => opacifyGlareColor(60, resolveGlareColor(value))).not.toThrow()
    }
  })
})

describe('opacifyGlareColor', () => {
  it('appends the alpha byte exactly like the legacy opacify', () => {
    // The legacy glare stops: opacify(0|60, color) on a simple hex.
    expect(opacifyGlareColor(0, '#FFFFFF')).toBe('#FFFFFF00')
    expect(opacifyGlareColor(60, '#FFFFFF')).toBe('#FFFFFF99')
    expect(opacifyGlareColor(60, '#131313')).toBe('#13131399')
    expect(opacifyGlareColor(100, '#131313')).toBe('#131313ff')
  })

  it('throws on a color resolveGlareColor would not produce', () => {
    expect(() => opacifyGlareColor(60, '#abc')).toThrow()
    expect(() => opacifyGlareColor(60, 'white')).toThrow()
    expect(() => opacifyGlareColor(60, '#13131z')).toThrow()
  })

  it('throws on an out-of-range amount', () => {
    expect(() => opacifyGlareColor(-1, '#FFFFFF')).toThrow()
    expect(() => opacifyGlareColor(101, '#FFFFFF')).toThrow()
  })
})
