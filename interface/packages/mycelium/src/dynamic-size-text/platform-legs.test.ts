/**
 * Platform-leg contract for the DynamicSizeText compat (INFRA-3596), following
 * `modal-close-icon/platform-legs.test.ts`: `moduleSuffixes` is configured
 * nowhere in the repo, so tsc only ever resolves the BASE leg — the base leg is
 * a 1-line re-export of the web leg, and base ≡ native is what this suite
 * proves.
 */
import { describe, expect, it } from 'vitest'
// Explicit .tsx extension: this vitest config resolves `.web.*` first, which
// would silently swap the platformless base leg for the web leg here.
import * as base from './DynamicSizeTextCompat.tsx'
import * as web from './DynamicSizeTextCompat.web'

describe('base leg re-exports the web leg', () => {
  it('DynamicSizeTextCompat', () => {
    expect(base.DynamicSizeTextCompat).toBe(web.DynamicSizeTextCompat)
  })
})

describe('export parity across the legs', () => {
  it('the native leg exports exactly the base leg symbol set', async () => {
    const native = await import('./DynamicSizeTextCompat.native')
    expect(Object.keys(native).sort()).toEqual(Object.keys(base).sort())
    expect(Object.keys(native)).toContain('DynamicSizeTextCompat')
  })

  it('both legs are real function components, not stubs', async () => {
    const native = await import('./DynamicSizeTextCompat.native')
    for (const leg of [web.DynamicSizeTextCompat, native.DynamicSizeTextCompat]) {
      expect(typeof leg).toBe('function')
    }
  })

  it('the native leg is NOT the web leg (a real split, not an accidental alias)', async () => {
    const native = await import('./DynamicSizeTextCompat.native')
    expect(native.DynamicSizeTextCompat).not.toBe(web.DynamicSizeTextCompat)
  })
})

describe('the subpath barrel resolves every symbol', () => {
  it('exports the component plus the shared contract', async () => {
    const barrel = await import('./index')
    expect(barrel.DynamicSizeTextCompat).toBe(web.DynamicSizeTextCompat)
    expect(barrel.DEFAULT_MIN_WEB_FONT_SIZE).toBe(8)
    expect(barrel.DEFAULT_MAX_WEB_FONT_SIZE).toBe(16)
  })
})
