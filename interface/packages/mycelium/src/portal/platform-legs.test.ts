/**
 * Pins the platform-leg contract of the portal primitive: the platformless
 * base leg throws the canonical `PlatformSplitStubError`, and all three legs
 * export the same symbol set so no bundler resolution can land on a missing
 * export.
 */
import { describe, expect, it, vi } from 'vitest'
// Explicit .tsx extension: the mycelium vitest config resolves `.web.*` first
// (web-first platform splits), which would silently swap the platformless
// base leg for the web leg in this import.
import * as base from './Portal.tsx'
import * as web from './Portal.web'

vi.mock('react-native', () => import('./testing/react-native-mock'))

describe('base leg (platformless stub)', () => {
  it('Portal throws the platform-override error', () => {
    expect(() => base.Portal({})).toThrowError('Portal not implemented. Did you forget a platform override?')
  })

  it('PortalProvider throws the platform-override error', () => {
    expect(() => base.PortalProvider({})).toThrowError(
      'PortalProvider not implemented. Did you forget a platform override?',
    )
  })
})

describe('export parity', () => {
  it('native, web, and base legs export the same symbols', async () => {
    const native = await import('./Portal.native')
    const baseKeys = Object.keys(base).sort()

    expect(baseKeys).toEqual(['Portal', 'PortalProvider'])
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })
})
