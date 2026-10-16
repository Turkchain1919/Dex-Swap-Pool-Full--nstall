/**
 * INFRA-3516: behavioral contract of the native Unicon leg, run under
 * react-test-renderer with minimal react-native / react-native-svg / uniwind
 * stand-ins (the floating-overlay native-suite pattern). Covers the theme
 * pipeline (uniwind `var()` indirection → hex), the deterministic fallback,
 * and the two web-leg render modes (`bare`, custom `icon`) this leg mirrors.
 */
import { createElement, type JSX } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UNICON_COLORS } from './colors'
import { deriveUnicon, uniconGeometry } from './derive'
import { FALLBACK_UNICON_BG_OPACITY } from './native-theme'
import { __resetCSSVariables, __setCSSVariables } from './testing/uniwind-mock'
import { Unicon } from './Unicon.native'

vi.mock('react-native', () => import('./testing/react-native-mock'))
vi.mock('react-native-svg', () => import('./testing/react-native-svg-mock'))
vi.mock('uniwind', () => import('./testing/uniwind-mock'))

// react-test-renderer's act() needs the explicit opt-in (floating-overlay precedent).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const INPUT = 'user@example.com'
const { colorIndex, paths } = deriveUnicon(INPUT)

function renderTree(ui: JSX.Element): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined
  act(() => {
    renderer = create(ui)
  })
  if (!renderer) {
    throw new Error('render produced no tree')
  }
  return renderer
}

afterEach(() => {
  __resetCSSVariables()
  vi.restoreAllMocks()
})

describe('theme resolution (uniwind variable store)', () => {
  it('resolves --unicon-N through one level of var() indirection, like the native.css buckets', () => {
    __setCSSVariables({
      [`--unicon-${colorIndex}`]: `var(--color-unicon-${colorIndex}-dark)`,
      [`--color-unicon-${colorIndex}-dark`]: '#5CFE9D',
      '--unicon-bg-opacity': 0.16,
    })
    const renderer = renderTree(<Unicon input={INPUT} size={40} />)
    const circle = renderer.root.findByType('Svg.Circle' as never)
    expect(circle.props['fill']).toBe('#5CFE9D')
    expect(circle.props['opacity']).toBe(0.16)
    expect(circle.props['cx']).toBe(20)
    expect(circle.props['r']).toBe(20)
    act(() => renderer.unmount())
  })

  it('resolves --unicon-bg-opacity through var() indirection too, not just --unicon-N', () => {
    __setCSSVariables({
      [`--unicon-${colorIndex}`]: '#5CFE9D',
      '--unicon-bg-opacity': 'var(--unicon-bg-opacity-alias)',
      '--unicon-bg-opacity-alias': 0.16,
    })
    const renderer = renderTree(<Unicon input={INPUT} size={40} />)
    const circle = renderer.root.findByType('Svg.Circle' as never)
    expect(circle.props['opacity']).toBe(0.16)
    act(() => renderer.unmount())
  })

  it('falls back to the static light palette (same index) when the store is not wired, with dev warnings for color AND opacity', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const renderer = renderTree(<Unicon input={INPUT} />)
    const circle = renderer.root.findByType('Svg.Circle' as never)
    expect(circle.props['fill']).toBe(UNICON_COLORS.light[colorIndex])
    expect(circle.props['opacity']).toBe(FALLBACK_UNICON_BG_OPACITY)
    const messages = warn.mock.calls.map((call) => String(call[0]))
    expect(messages).toHaveLength(2)
    expect(messages.some((message) => message.includes(`--unicon-${colorIndex} did not resolve`))).toBe(true)
    expect(messages.some((message) => message.includes('--unicon-bg-opacity did not resolve'))).toBe(true)
    act(() => renderer.unmount())
  })
})

describe('render modes', () => {
  it('draws the derived glyph inside the web leg geometry', () => {
    const renderer = renderTree(<Unicon input={INPUT} size={32} />)
    const { scale, translate } = uniconGeometry({ size: 32 })
    const group = renderer.root.findByType('Svg.G' as never)
    expect(group.props['transform']).toBe(`translate(${translate}, ${translate}) scale(${scale})`)
    const drawn = renderer.root.findAllByType('Svg.Path' as never).map((path) => (path.props as { d: string }).d)
    expect(drawn).toEqual(paths)
    act(() => renderer.unmount())
  })

  it('bare: no background circle, glyph fills the container', () => {
    const renderer = renderTree(<Unicon input={INPUT} size={48} bare />)
    expect(renderer.root.findAllByType('Svg.Circle' as never)).toHaveLength(0)
    const group = renderer.root.findByType('Svg.G' as never)
    expect(group.props['transform']).toBe(`translate(0, 0) scale(1)`)
    act(() => renderer.unmount())
  })

  it('custom icon: keeps the circle, drops the glyph, centers the icon in the overlay box', () => {
    __setCSSVariables({ [`--unicon-${colorIndex}`]: '#3ADCFF', '--unicon-bg-opacity': 0.12 })
    const marker = createElement('CustomIcon', null, 'custom')
    const renderer = renderTree(<Unicon input={INPUT} size={40} icon={marker} />)
    expect(renderer.root.findAllByType('Svg.Circle' as never)).toHaveLength(1)
    expect(renderer.root.findAllByType('Svg.Path' as never)).toHaveLength(0)
    expect(renderer.root.findAllByType('CustomIcon' as never)).toHaveLength(1)
    const { iconSize } = uniconGeometry({ size: 40 })
    const box = renderer.root.findAll(
      (node) =>
        // The mocked react-native View mounts as the host string 'View', which
        // React's ElementType union cannot name — hence the widening cast.
        (node.type as unknown as string) === 'View' &&
        typeof node.props['style'] === 'object' &&
        JSON.stringify(node.props['style']).includes(`"width":${iconSize}`),
    )
    expect(box.length).toBeGreaterThan(0)
    // The box clips its content like the web leg's foreignObject viewport.
    expect(JSON.stringify(box[0]?.props['style'])).toContain('"overflow":"hidden"')
    act(() => renderer.unmount())
  })
})
