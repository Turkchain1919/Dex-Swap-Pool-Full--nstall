/**
 * Platform-leg contract for the AnimatedTouchableArea compat — see
 * `animated-flex-compat/platform-legs.test.ts` for the rationale.
 */
import { PlatformSplitStubError } from '@universe/environment'
import { describe, expect, it, vi } from 'vitest'
// Explicit .tsx extension: this vitest config resolves `.web.*` first, which
// would silently swap the platformless base leg for the web leg here.
import * as base from './AnimatedTouchableAreaCompat.tsx'
import * as web from './AnimatedTouchableAreaCompat.web'

// The native leg's dependency closure resolves untranspiled RN-flavored
// sources under this jsdom config — serve the button-compat stand-ins instead.
// The real modules are exercised by the packages/tailwind native harness
// (src/parity/animated-touchable-area).
vi.mock('react-native', () => import('../button-compat/testing/native-mocks'))
vi.mock('react-native-reanimated', () => import('../button-compat/testing/reanimated-mock'))

type ForwardRefLike = { render: (props: unknown, ref: unknown) => unknown }

describe('base leg is the throwing platform stub', () => {
  it('throws PlatformSplitStubError when rendered', () => {
    const render = (base.AnimatedTouchableAreaCompat as unknown as ForwardRefLike).render
    expect(() => render({}, null)).toThrowError(PlatformSplitStubError)
  })
})

describe('export parity across the legs', () => {
  it('web and native legs export exactly the base leg symbol set', async () => {
    const native = await import('./AnimatedTouchableAreaCompat.native')
    const baseKeys = Object.keys(base).sort()
    expect(baseKeys).toEqual(['AnimatedTouchableAreaCompat'])
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })

  it('the web and native legs are real components, distinct from the base stub and each other', async () => {
    const native = await import('./AnimatedTouchableAreaCompat.native')
    expect(web.AnimatedTouchableAreaCompat).not.toBe(base.AnimatedTouchableAreaCompat)
    expect(native.AnimatedTouchableAreaCompat).not.toBe(base.AnimatedTouchableAreaCompat)
    expect(native.AnimatedTouchableAreaCompat).not.toBe(web.AnimatedTouchableAreaCompat)
  })
})

describe('the subpath barrel resolves every symbol', () => {
  it('exports the component (web leg under this config)', async () => {
    const barrel = await import('./index')
    expect(barrel.AnimatedTouchableAreaCompat).toBe(web.AnimatedTouchableAreaCompat)
  })
})
