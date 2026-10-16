/**
 * Platform-leg contract for the native-first `useThemeVariable` hook: all
 * three legs export the same symbol set (the floating-overlay convention),
 * the base and web legs throw loudly, and the native leg resolves `var()`
 * indirection through uniwind's store — the behavior the Shimmer and Unicon
 * native legs import explicitly.
 */
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
// Explicit .ts extension: the mycelium vitest config resolves `.web.*` first
// (web-first platform splits), which would silently swap the platformless
// base leg for the web leg in this import.
import * as base from './useThemeVariable.ts'
import * as web from './useThemeVariable.web'

vi.mock('uniwind', () => import('../unicon/testing/uniwind-mock'))

describe('base leg (platformless stub)', () => {
  it('throws the platform-override error', () => {
    expect(() => base.useThemeVariable('--surface1')).toThrowError(
      'useThemeVariable not implemented. Did you forget a platform override?',
    )
  })
})

describe('web leg (deliberate stub toward plain CSS var() consumption)', () => {
  it('throws and points at CSS custom properties', () => {
    expect(() => web.useThemeVariable('--surface1')).toThrowError(/native-only.*var\(--name\)/)
  })
})

describe('export parity', () => {
  it('native, web, and base legs export the same symbols', async () => {
    const native = await import('./useThemeVariable.native')
    const baseKeys = Object.keys(base).sort()
    expect(baseKeys).toEqual(['useThemeVariable'])
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })
})

describe('native leg (uniwind variable store)', () => {
  it('resolves chained var() indirection to the terminal value', async () => {
    const { useThemeVariable } = await import('./useThemeVariable.native')
    const { __setCSSVariables, __resetCSSVariables } = await import('../unicon/testing/uniwind-mock')
    __setCSSVariables({
      '--surface1': 'var(--color-surface1-dark)',
      '--color-surface1-dark': '#131313',
    })
    const { result, unmount } = renderHook(() => useThemeVariable('--surface1'))
    expect(result.current).toBe('#131313')
    unmount()
    __resetCSSVariables()
  })
})
