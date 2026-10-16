/**
 * Pins the platform-leg contract of the button-frame-compat three-file splits
 * (`ButtonFrameCompat` / `ButtonTextCompat` / `ThemedIconCompat`+
 * `ThemedSpinnerCompat`) — a platformless base stub that throws, the real
 * `.web.tsx` implementation, and the `.native.tsx` React Native leg — per
 * `packages/mycelium/CLAUDE.md` ("Keep exports identical across all three
 * legs"). Ported from `../button-compat/platform-legs.test.tsx`, reusing its
 * native mocks and its documented gotcha: the mycelium vitest config resolves
 * `.web.*` first, so the base leg must be imported with an explicit extension
 * or the resolver silently swaps it for the web leg.
 *
 * Value-level only (`Object.keys`) — the TYPE export names are pinned by
 * `./export-type-parity.test.ts`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
// Explicit .tsx extensions — see the header note.
import * as frameBase from './ButtonFrameCompat.tsx'
import * as frameWeb from './ButtonFrameCompat.web'
import * as textBase from './ButtonTextCompat.tsx'
import * as textWeb from './ButtonTextCompat.web'
import * as iconBase from './ThemedIconCompat.tsx'
import * as iconWeb from './ThemedIconCompat.web'

vi.mock('react-native', () => import('../button-compat/testing/native-mocks'))
vi.mock('react-native-gesture-handler', () => import('../button-compat/testing/gesture-handler-mock'))
vi.mock('react-native-reanimated', () => import('../button-compat/testing/reanimated-mock'))
vi.mock('react-native-svg', () => import('../button-compat/testing/react-native-svg-mock'))
vi.mock('uniwind', () => import('../button-compat/testing/uniwind-mock'))

describe('export parity across the button-frame-compat platform legs', () => {
  it.each([
    ['ButtonFrameCompat', frameBase, frameWeb, () => import('./ButtonFrameCompat.native')],
    ['ButtonTextCompat', textBase, textWeb, () => import('./ButtonTextCompat.native')],
    ['ThemedIconCompat', iconBase, iconWeb, () => import('./ThemedIconCompat.native')],
  ] as const)('%s: all three legs export the same symbols', async (_name, base, web, loadNative) => {
    const native = await loadNative()
    const baseKeys = Object.keys(base).sort()
    expect(baseKeys.length).toBeGreaterThan(0)
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })

  it('the implementation legs export forwardRef frame/text components', async () => {
    const frameNative = await import('./ButtonFrameCompat.native')
    const textNative = await import('./ButtonTextCompat.native')
    for (const component of [
      frameWeb.ButtonFrameCompat,
      frameNative.ButtonFrameCompat,
      textWeb.ButtonTextCompat,
      textNative.ButtonTextCompat,
    ]) {
      expect((component as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.forward_ref'))
    }
  })
})

describe('base legs (platformless stubs)', () => {
  it('rendering ButtonFrameCompat throws the platform-override error', () => {
    // Reaching the base leg means the bundler's platform extension order did
    // not resolve — it must fail loudly rather than render an empty frame.
    expect(() => renderToStaticMarkup(<frameBase.ButtonFrameCompat>Swap</frameBase.ButtonFrameCompat>)).toThrowError(
      'ButtonFrameCompat not implemented. Did you forget a platform override?',
    )
  })

  it('rendering ButtonTextCompat throws the platform-override error', () => {
    expect(() => renderToStaticMarkup(<textBase.ButtonTextCompat>Swap</textBase.ButtonTextCompat>)).toThrowError(
      'ButtonTextCompat not implemented. Did you forget a platform override?',
    )
  })

  it.each([
    ['ThemedIconCompat', () => iconBase.ThemedIconCompat({ typeOfButton: 'button' })],
    ['ThemedSpinnerCompat', () => iconBase.ThemedSpinnerCompat({ typeOfButton: 'button' })],
  ])('%s throws the platform-override error', (name, render) => {
    expect(render).toThrowError(`${name} not implemented. Did you forget a platform override?`)
  })
})

describe('web legs (what apps/web resolves)', () => {
  it('ButtonFrameCompat renders a real button element', () => {
    const markup = renderToStaticMarkup(<frameWeb.ButtonFrameCompat>Swap</frameWeb.ButtonFrameCompat>)
    expect(markup).toContain('<button')
    expect(markup).toContain('Swap')
  })

  it('ButtonTextCompat renders a span', () => {
    const markup = renderToStaticMarkup(<textWeb.ButtonTextCompat>Swap</textWeb.ButtonTextCompat>)
    expect(markup).toContain('<span')
    expect(markup).toContain('Swap')
  })
})
