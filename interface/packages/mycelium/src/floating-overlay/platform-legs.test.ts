/**
 * INFRA-2965: pins the platform-leg contract of the floating-overlay
 * primitive — the base and web legs throw loudly (web floating overlays come
 * from the Base UI menus family, INFRA-3021), and all three legs export the
 * same symbol set so no bundler resolution can end up with a missing export.
 */
import { describe, expect, it, vi } from 'vitest'
// Explicit .tsx extension: the mycelium vitest config resolves `.web.*` first
// (web-first platform splits), which would silently swap the platformless
// base leg for the web leg in this import.
import * as base from './FloatingOverlay.tsx'
import * as web from './FloatingOverlay.web'

vi.mock('react-native', () => import('./testing/react-native-mock'))

// Each entry renders its own stub, so the props stay typed per component
// (`it.each` would otherwise collapse them into one union and demand the
// intersection of all five prop types).
const BASE_COMPONENTS: ReadonlyArray<readonly [string, () => unknown]> = [
  ['FloatingOverlayProvider', () => base.FloatingOverlayProvider({})],
  ['FloatingOverlayRoot', () => base.FloatingOverlayRoot({})],
  ['FloatingOverlayAnchor', () => base.FloatingOverlayAnchor({})],
  ['FloatingOverlayContent', () => base.FloatingOverlayContent({})],
  ['FloatingOverlayArrow', () => base.FloatingOverlayArrow({ color: '#000000' })],
]

const WEB_COMPONENTS: ReadonlyArray<readonly [string, () => unknown]> = [
  ['FloatingOverlayProvider', () => web.FloatingOverlayProvider({})],
  ['FloatingOverlayRoot', () => web.FloatingOverlayRoot({})],
  ['FloatingOverlayAnchor', () => web.FloatingOverlayAnchor({})],
  ['FloatingOverlayContent', () => web.FloatingOverlayContent({})],
  ['FloatingOverlayArrow', () => web.FloatingOverlayArrow({ color: '#000000' })],
]

describe('base leg (platformless stub)', () => {
  it.each(BASE_COMPONENTS)('%s throws the platform-override error', (name, render) => {
    expect(render).toThrowError(`${name} not implemented. Did you forget a platform override?`)
  })

  it('useFloatingOverlayState throws the platform-override error', () => {
    expect(() => base.useFloatingOverlayState()).toThrowError(
      'useFloatingOverlayState not implemented. Did you forget a platform override?',
    )
  })
})

describe('web leg (deliberate stub toward the Base UI menus family)', () => {
  it.each(WEB_COMPONENTS)('%s throws and points at INFRA-3021', (name, render) => {
    expect(render).toThrowError(new RegExp(`${name} is native-only \\(INFRA-2965\\).*INFRA-3021`))
  })

  it('useFloatingOverlayState throws and points at INFRA-3021', () => {
    expect(() => web.useFloatingOverlayState()).toThrowError(/INFRA-3021/)
  })
})

describe('export parity', () => {
  it('native, web, and base legs export the same symbols', async () => {
    const native = await import('./FloatingOverlay.native')
    const baseKeys = Object.keys(base).sort()
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })
})
