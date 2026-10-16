/**
 * INFRA-3516: platform-leg contract for Unicon. Before this suite the
 * `.native` leg was a deliberate throwing stub — the exact SegmentedControl
 * incident shape (#39180/#39448) pointed at native — so beyond the standard
 * export-parity pin (base ≡ web ≡ native, the floating-overlay convention)
 * this proves the native leg is a REAL renderable component that draws the
 * same derived avatar as the web leg for the same input.
 */
import { render } from '@testing-library/react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { deriveUnicon } from './derive'
// Explicit .tsx extension: the mycelium vitest config resolves `.web.*` first
// (web-first platform splits), which would silently swap the platformless
// base leg for the web leg in this import.
import * as base from './Unicon.tsx'
import * as web from './Unicon.web'

// The native leg imports react-native, react-native-svg, and uniwind — none
// of which load under this jsdom config (flow sources / native variable
// store). Same mock pattern as modal-close-icon/platform-legs.test.ts.
vi.mock('react-native', () => import('./testing/react-native-mock'))
vi.mock('react-native-svg', () => import('./testing/react-native-svg-mock'))
vi.mock('uniwind', () => import('./testing/uniwind-mock'))

// react-test-renderer's act() needs the explicit opt-in (floating-overlay precedent).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const INPUT = '0xE1b1e2a97ceA3A6EbA8FdcD4E27CC3EFbfd4B44b'

describe('base leg (platformless stub)', () => {
  it('Unicon throws the platform-override error', () => {
    expect(() => base.Unicon({ input: INPUT })).toThrowError(
      'Unicon not implemented. Did you forget a platform override?',
    )
  })
})

describe('export parity across the legs', () => {
  it('native, web, and base legs export the same symbol set', async () => {
    const native = await import('./Unicon.native')
    const baseKeys = Object.keys(base).sort()
    expect(baseKeys).toContain('Unicon')
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })

  it('the native leg is a real component, not the web leg and not a stub', async () => {
    const native = await import('./Unicon.native')
    expect(typeof native.Unicon).toBe('function')
    expect(native.Unicon).not.toBe(web.Unicon)
    expect(native.Unicon).not.toBe(base.Unicon)
  })
})

describe('cross-leg avatar parity for the same input', () => {
  const { colorIndex, paths } = deriveUnicon(INPUT)

  it('the web leg renders the derived color slot and glyph paths', () => {
    const { container } = render(<web.Unicon input={INPUT} size={32} />)
    const circle = container.querySelector('circle')
    expect(circle?.getAttribute('fill')).toBe(`var(--unicon-${colorIndex})`)
    const drawn = Array.from(container.querySelectorAll('path')).map((path) => path.getAttribute('d'))
    expect(drawn).toEqual(paths)
  })

  it('the native leg renders the same color slot and glyph paths', async () => {
    const native = await import('./Unicon.native')
    const uniwind = await import('./testing/uniwind-mock')
    uniwind.__setCSSVariables({
      [`--unicon-${colorIndex}`]: `var(--color-unicon-${colorIndex}-light)`,
      [`--color-unicon-${colorIndex}-light`]: '#0C8911',
      '--unicon-bg-opacity': 0.12,
    })

    let renderer: ReactTestRenderer | undefined
    act(() => {
      renderer = create(<native.Unicon input={INPUT} size={32} />)
    })
    if (!renderer) {
      throw new Error('render produced no tree')
    }
    const tree = renderer
    const circle = tree.root.findByType('Svg.Circle' as never)
    expect(circle.props['fill']).toBe('#0C8911')
    const drawn = tree.root.findAllByType('Svg.Path' as never).map((path) => (path.props as { d: string }).d)
    expect(drawn).toEqual(paths)
    act(() => tree.unmount())
    uniwind.__resetCSSVariables()
  })
})
