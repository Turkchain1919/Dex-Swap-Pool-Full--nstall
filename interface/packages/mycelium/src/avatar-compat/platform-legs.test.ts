/**
 * Platform-leg contract for the avatar compat compound (INFRA-3591), following
 * `checkbox-compat/platform-legs.test.ts`.
 *
 * Why this has to exist: `moduleSuffixes` is configured nowhere in the repo, so
 * `tsc` only ever resolves the BASE leg — a `.native` leg cannot carry a
 * different type, and nothing in the typechecker notices if it exports a
 * different symbol set. A bundler that resolved the native leg would then hit a
 * missing export at runtime. The base leg is a 1-line re-export of the web leg,
 * so base ≡ web is a structural given; base ≡ native is what this suite proves.
 */
import { describe, expect, it, vi } from 'vitest'
import { isMyceliumPrimitive } from '../compat/primitive-marker'
// Explicit .tsx extension: this vitest config resolves `.web.*` first, which
// would silently swap the platformless base leg for the web leg here.
import * as avatarBase from './AvatarCompat.tsx'
import * as avatarWeb from './AvatarCompat.web'

vi.mock('react-native', () => import('./testing/react-native-mock'))

describe('base leg re-exports the web leg', () => {
  it('AvatarCompat', () => {
    expect(avatarBase.AvatarCompat).toBe(avatarWeb.AvatarCompat)
  })
})

describe('export parity across the legs', () => {
  it('the native leg exports exactly the base leg symbol set', async () => {
    const native = await import('./AvatarCompat.native')
    expect(Object.keys(native).sort()).toEqual(Object.keys(avatarBase).sort())
    expect(Object.keys(native)).toContain('AvatarCompat')
  })

  it('both legs carry the full compound shape (root + Image + Fallback), no stubs', async () => {
    const native = await import('./AvatarCompat.native')
    for (const compound of [avatarWeb.AvatarCompat, native.AvatarCompat]) {
      expect(typeof compound).toBe('object')
      expect(compound).toHaveProperty('render')
      expect(compound.Image).toBeDefined()
      expect(compound.Fallback).toBeDefined()
    }
  })

  it('the native leg is NOT the web leg (a real split, not an accidental alias)', async () => {
    const native = await import('./AvatarCompat.native')
    expect(native.AvatarCompat).not.toBe(avatarWeb.AvatarCompat)
  })

  it('both legs carry the primitive marker on the compound and its statics (the roster-suite contract)', async () => {
    const native = await import('./AvatarCompat.native')
    for (const compound of [avatarWeb.AvatarCompat, native.AvatarCompat]) {
      expect(isMyceliumPrimitive(compound)).toBe(true)
      expect(isMyceliumPrimitive(compound.Image)).toBe(true)
      expect(isMyceliumPrimitive(compound.Fallback)).toBe(true)
    }
  })
})

describe('the subpath barrel resolves every symbol on both platforms', () => {
  it('exports the compound plus the shared compile helpers', async () => {
    const barrel = await import('./index')
    expect(barrel.AvatarCompat).toBe(avatarWeb.AvatarCompat)
    expect(barrel.DEFAULT_AVATAR_SIZE).toBe('$true')
    expect(barrel.avatarSizePx(32)).toBe(32)
    expect(barrel.avatarSizePx('$spacing48')).toBe(48)
  })

  it('does not export a bare `Avatar` — those names belong to the untouched components/avatar.tsx', async () => {
    const barrel = (await import('./index')) as Record<string, unknown>
    expect(barrel['Avatar']).toBeUndefined()
    expect(barrel['AvatarImage']).toBeUndefined()
    expect(barrel['AvatarFallback']).toBeUndefined()
  })
})
