/**
 * Platform-leg contract for the UniversalImage split leaves (INFRA-3682).
 *
 * Why this has to exist: `moduleSuffixes` is configured nowhere in the repo,
 * so `tsc` only ever resolves the BASE leg — a `.native` leg cannot carry a
 * different type, and nothing in the typechecker notices if it exports a
 * different symbol set. A bundler that resolved the base leg at runtime must
 * fail loudly (the INFRA-3514 stub contract), and the two real legs must
 * export the same symbol set.
 */
import { PlatformSplitStubError } from '@universe/environment'
import { describe, expect, it, vi } from 'vitest'

// The native legs import react-native (Flow sources this jsdom config cannot
// parse), expo-image and react-native-webview (native modules); mock the
// hosts the legs mount so the import-parity checks can load them.
vi.mock('react-native', () => ({
  View: (): null => null,
  Image: { getSize: (): void => undefined },
}))
vi.mock('expo-image', () => ({
  Image: (): null => null,
}))
vi.mock('react-native-webview', () => {
  const WebView = (): null => null
  return { default: WebView, WebView }
})

// Explicit .tsx/.ts extensions where a `.web` sibling exists: this vitest
// config resolves `.web.*` first, which would silently swap the platformless
// base leg for the web leg.
const SPLIT_FAMILIES = [
  {
    name: 'PlainImage',
    base: () => import('./internal/PlainImage.tsx'),
    web: () => import('./internal/PlainImage.web'),
    native: () => import('./internal/PlainImage.native'),
  },
  {
    name: 'RequireImage',
    base: () => import('./internal/RequireImage.tsx'),
    web: () => import('./internal/RequireImage.web'),
    native: () => import('./internal/RequireImage.native'),
  },
  {
    name: 'SvgImage',
    base: () => import('./internal/SvgImage.tsx'),
    web: () => import('./internal/SvgImage.web'),
    native: () => import('./internal/SvgImage.native'),
  },
] as const

describe('base legs are throwing stubs (INFRA-3514: never a silent web default)', () => {
  for (const family of SPLIT_FAMILIES) {
    it(`${family.name} base stub throws`, async () => {
      const base = (await family.base()) as Record<string, unknown>
      const [exportName, stub] = Object.entries(base)[0] as [string, (arg: unknown) => unknown]
      expect(exportName).toBeDefined()
      expect(() => stub({})).toThrowError(PlatformSplitStubError)
    })
  }
})

describe('export parity across the legs', () => {
  for (const family of SPLIT_FAMILIES) {
    it(`${family.name}: web, native and base export the same symbol set`, async () => {
      const [base, web, native] = await Promise.all([family.base(), family.web(), family.native()])
      expect(Object.keys(web).sort()).toEqual(Object.keys(base).sort())
      expect(Object.keys(native).sort()).toEqual(Object.keys(base).sort())
    })

    it(`${family.name}: the native leg is NOT the web leg (a real split, not an accidental alias)`, async () => {
      const [web, native] = (await Promise.all([family.web(), family.native()])) as [
        Record<string, unknown>,
        Record<string, unknown>,
      ]
      for (const key of Object.keys(web)) {
        expect(native[key]).not.toBe(web[key])
      }
    })
  }
})

describe('the subpath barrel resolves every symbol', () => {
  it('exports the component, the resize-mode enum and the svg utils', async () => {
    const barrel = await import('./index')
    expect(typeof barrel.UniversalImage).toBe('function')
    expect(barrel.UniversalImageResizeMode.Cover).toBe('cover')
    expect(typeof barrel.fetchSVG).toBe('function')
    expect(typeof barrel.useSvgData).toBe('function')
  })

  it('the root barrel re-exports the same component', async () => {
    const [barrel, root] = await Promise.all([import('./index'), import('../index')])
    expect(root.UniversalImage).toBe(barrel.UniversalImage)
    expect(root.UniversalImageResizeMode).toBe(barrel.UniversalImageResizeMode)
  })
})
