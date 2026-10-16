/**
 * Platform-leg contract for the AnimatedFlex compat, following
 * `spinning-loader-compat/platform-legs.test.ts`.
 *
 * `moduleSuffixes` is configured nowhere in the repo, so `tsc` only ever
 * resolves the BASE leg — a `.native` leg cannot carry a different type, and
 * nothing in the typechecker notices if it exports a different symbol set.
 * This suite pins the runtime export parity and that the base is the throwing
 * platform stub (the canonical convention, packages/mycelium/CLAUDE.md).
 */
import { PlatformSplitStubError } from '@universe/environment'
import { describe, expect, it, vi } from 'vitest'
// Explicit .tsx extension: this vitest config resolves `.web.*` first, which
// would silently swap the platformless base leg for the web leg here.
import * as base from './AnimatedFlexCompat.tsx'
import * as web from './AnimatedFlexCompat.web'

// The native leg's dependency closure resolves untranspiled RN-flavored
// sources under this jsdom config — serve the button-compat stand-ins instead.
// The real modules are exercised by the packages/tailwind native harness
// (src/parity/animated-flex).
vi.mock('react-native', () => import('../button-compat/testing/native-mocks'))
vi.mock('react-native-reanimated', () => import('../button-compat/testing/reanimated-mock'))

type ForwardRefLike = { render: (props: unknown, ref: unknown) => unknown }

describe('base leg is the throwing platform stub', () => {
  it('throws PlatformSplitStubError when rendered', () => {
    const render = (base.AnimatedFlexCompat as unknown as ForwardRefLike).render
    expect(() => render({}, null)).toThrowError(PlatformSplitStubError)
  })
})

describe('export parity across the legs', () => {
  it('web and native legs export exactly the base leg symbol set', async () => {
    const native = await import('./AnimatedFlexCompat.native')
    const baseKeys = Object.keys(base).sort()
    expect(baseKeys).toEqual(['AnimatedFlexCompat'])
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })

  it('the web and native legs are real components, distinct from the base stub and each other', async () => {
    const native = await import('./AnimatedFlexCompat.native')
    expect(web.AnimatedFlexCompat).not.toBe(base.AnimatedFlexCompat)
    expect(native.AnimatedFlexCompat).not.toBe(base.AnimatedFlexCompat)
    expect(native.AnimatedFlexCompat).not.toBe(web.AnimatedFlexCompat)
  })
})

describe('the subpath barrel resolves every symbol', () => {
  it('exports the component (web leg under this config)', async () => {
    const barrel = await import('./index')
    expect(barrel.AnimatedFlexCompat).toBe(web.AnimatedFlexCompat)
  })
})
