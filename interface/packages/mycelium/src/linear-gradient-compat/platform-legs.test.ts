/**
 * Platform-leg contract for the LinearGradient compat, following
 * `anchor-compat/platform-legs.test.ts`.
 *
 * SCOPE: export-shape and component-wiring pins only (see the
 * view-compat/platform-legs.test.ts header) — the mycelium vitest config is
 * jsdom with `.web.*` resolved first and `react-native` / `expo-linear-gradient`
 * / `uniwind` replaced by stand-ins, so nothing here says what resolves on a
 * device. What it proves: base ≡ web, native exports the same symbol set,
 * the native leg mounts the real expo gradient host behind the children with
 * `$` tokens resolved through the variable store (indirection chase included),
 * and unresolved variables degrade to transparent instead of crashing.
 */
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetLinearGradientStopWarnings } from './diagnostics'
// Explicit .tsx extension: this vitest config resolves `.web.*` first, which
// would silently swap the platformless base leg for the web leg here.
import * as base from './LinearGradientCompat.tsx'
import * as web from './LinearGradientCompat.web'
import type { LinearGradientCompatProps } from './props'

vi.mock('react-native', () => import('./testing/react-native-mock'))

// The native leg imports the frame by its BASE specifier (Metro resolves the
// .native leg); this jsdom config resolves `.web.*` first, so the frame must
// be pinned to its native leg explicitly or the suite would mount a DOM div.
vi.mock('../view-compat/ViewCompat', () => import('../view-compat/ViewCompat.native'))

vi.mock('expo-linear-gradient', async () => {
  const react = await import('react')
  const Host = react.forwardRef<unknown, Record<string, unknown>>((props, ref) =>
    react.createElement('ExpoLinearGradient', { ...props, ref }),
  )
  Host.displayName = 'ExpoLinearGradient'
  return { LinearGradient: Host }
})

/**
 * Variable store stand-in with one level of `var()` indirection, mirroring how
 * `@universe/tailwind/native.css` declares `--surface1` as a reference to the
 * per-theme palette variable.
 */
const VARIABLE_STORE: Record<string, string> = {
  '--surface1': 'var(--color-surface1-light)',
  '--color-surface1-light': '#FFFFFF',
  '--accent1': '#FC72FF',
}

vi.mock('uniwind', () => ({
  useCSSVariable: (names: string[]): (string | undefined)[] => names.map((name) => VARIABLE_STORE[name]),
}))

// react-test-renderer's act() needs the explicit opt-in outside jsdom setups.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

beforeEach(() => {
  __resetLinearGradientStopWarnings()
})

async function nativeLeg(): Promise<typeof import('./LinearGradientCompat.native')> {
  return import('./LinearGradientCompat.native')
}

async function renderNative(props: LinearGradientCompatProps, children?: unknown): Promise<ReactTestRenderer> {
  const { LinearGradientCompat } = await nativeLeg()
  let renderer: ReactTestRenderer | undefined
  act(() => {
    renderer = create(createElement(LinearGradientCompat, props as never, children as never))
  })
  if (renderer === undefined) {
    throw new Error('LinearGradientCompat.native render failed')
  }
  return renderer
}

function gradientHost(renderer: ReactTestRenderer): ReactTestInstance {
  return renderer.root.findByType('ExpoLinearGradient' as never)
}

describe('base leg re-exports the web leg', () => {
  it('LinearGradientCompat', () => {
    expect(base.LinearGradientCompat).toBe(web.LinearGradientCompat)
  })
})

describe('export parity across the legs', () => {
  it('the native leg exports exactly the base leg symbol set', async () => {
    const native = await nativeLeg()
    expect(Object.keys(native).sort()).toEqual(Object.keys(base).sort())
    expect(Object.keys(native)).toContain('LinearGradientCompat')
  })

  it('both legs carry the mycelium primitive marker (the $accent3-injection crash vector)', async () => {
    const native = await nativeLeg()
    const { isMyceliumPrimitive } = await import('../compat/primitive-marker')
    expect(isMyceliumPrimitive(web.LinearGradientCompat)).toBe(true)
    expect(isMyceliumPrimitive(native.LinearGradientCompat)).toBe(true)
  })

  it('the native leg is NOT the web leg (a real split, not an accidental alias)', async () => {
    const native = await nativeLeg()
    expect(native.LinearGradientCompat).not.toBe(web.LinearGradientCompat)
  })
})

describe('native leg mounts the expo gradient behind the children', () => {
  it('renders an RN View frame with the gradient host first and no DOM element', async () => {
    const renderer = await renderNative({ colors: ['#000000', '#ffffff'] }, 'child')
    expect(renderer.root.findByType('RNView' as never)).toBeDefined()
    expect(gradientHost(renderer)).toBeDefined()
    for (const tag of ['div', 'span']) {
      expect(renderer.root.findAllByType(tag as never)).toHaveLength(0)
    }
    act(() => renderer.unmount())
  })

  it('forwards literal stops, locations and points verbatim', async () => {
    const renderer = await renderNative({
      colors: ['#000000', 'rgba(0,0,0,0.5)'],
      locations: [0, 0.75],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    })
    const host = gradientHost(renderer)
    expect(host.props['colors']).toEqual(['#000000', 'rgba(0,0,0,0.5)'])
    expect(host.props['locations']).toEqual([0, 0.75])
    expect(host.props['start']).toEqual({ x: 0, y: 0 })
    expect(host.props['end']).toEqual({ x: 1, y: 0 })
    act(() => renderer.unmount())
  })

  it('resolves $ tokens through the variable store, chasing var() indirection', async () => {
    const renderer = await renderNative({ colors: ['$surface1', '$accent1', '$transparent'] })
    expect(gradientHost(renderer).props['colors']).toEqual(['#FFFFFF', '#FC72FF', 'transparent'])
    act(() => renderer.unmount())
  })

  it('degrades an unresolved KNOWN token to transparent with a dev warning instead of crashing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const renderer = await renderNative({ colors: ['$surface2', '#000000'] })
    expect(gradientHost(renderer).props['colors']).toEqual(['transparent', '#000000'])
    expect(warn.mock.calls.some((call) => String(call[0]).includes('--surface2'))).toBe(true)
    act(() => renderer.unmount())
    warn.mockRestore()
  })

  it('skips the gradient host below two stops (the expo minimum) but keeps frame and children', async () => {
    const renderer = await renderNative({ colors: ['#000000'] }, 'child')
    expect(renderer.root.findAllByType('ExpoLinearGradient' as never)).toHaveLength(0)
    expect(renderer.root.findByType('RNView' as never)).toBeDefined()
    act(() => renderer.unmount())
  })

  it('throws on an unknown $ token, matching the web color boundary', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(renderNative({ colors: ['$notAToken', '#fff'] })).rejects.toThrow(
      'has no @universe/tailwind counterpart',
    )
    spy.mockRestore()
  })
})
