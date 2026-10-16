/**
 * INFRA-3344: pins the platform-leg contract of the pager family — the base
 * leg throws loudly, and all three legs export the same symbol set so no
 * bundler resolution can end up with a missing export (floating-overlay
 * precedent).
 */
import { describe, expect, it, vi } from 'vitest'
// Explicit .tsx extension: the mycelium vitest config resolves `.web.*` first
// (web-first platform splits), which would silently swap the platformless
// base leg for the web leg in this import.
import * as base from './AnimatePresencePager.tsx'
import * as web from './AnimatePresencePager.web'

vi.mock('react-native-reanimated', () => import('../presence/testing/reanimated-mock'))

const BASE_COMPONENTS: ReadonlyArray<readonly [string, () => unknown]> = [
  ['TransitionItem', () => base.TransitionItem({})],
  ['AnimateTransition', () => base.AnimateTransition({ currentIndex: 0, children: null })],
  ['AnimatedPager', () => base.AnimatedPager({ currentIndex: 0, children: null })],
]

describe('base leg (platformless stub)', () => {
  it.each(BASE_COMPONENTS)('%s throws the platform-override error', (name, render) => {
    expect(render).toThrowError(`${name} not implemented. Did you forget a platform override?`)
  })
})

describe('export parity', () => {
  it('native, web, and base legs export the same symbols', async () => {
    const native = await import('./AnimatePresencePager.native')
    const baseKeys = Object.keys(base).sort()
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })
})
