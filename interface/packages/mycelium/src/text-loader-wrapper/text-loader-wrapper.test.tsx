/**
 * Pins the `TextLoaderWrapper` platform-leg contract: the placeholder DOM /
 * RN view tree each leg renders (the legacy `TextPlaceholder` chrome), the
 * per-platform bar fill, the native screen-reader hiding, and the optional
 * shimmer wrap. Runs under `packages/mycelium/vitest.config.ts` (jsdom,
 * `.web.*` first, `react-native` replaced by the hand-written stand-in), so
 * it is an export-shape and wiring pin — not native style evidence.
 */
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import * as barrel from '../index'
import { Shimmer as ShimmerWeb } from '../shimmer/Shimmer.web'
import { TEXT_PLACEHOLDER_OVERLAY_CLASSES } from '../text-compat/compile'
import * as nativeLeg from './TextLoaderWrapper.native'
// Explicit .tsx extension: the mycelium vitest config resolves `.web.*` first,
// which would silently swap the platformless base leg for the web leg here.
import * as base from './TextLoaderWrapper.tsx'
import * as web from './TextLoaderWrapper.web'

vi.mock('react-native', () => import('../compat/testing/react-native-mock'))

// react-test-renderer's act() needs the explicit opt-in outside jsdom setups.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function render(element: React.ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined
  act(() => {
    renderer = create(element)
  })
  if (renderer === undefined) {
    throw new Error('render did not commit')
  }
  return renderer
}

describe('platform legs', () => {
  it('export the same surface, and the base leg is the guarded stub', () => {
    expect(Object.keys(web).sort()).toEqual(Object.keys(base).sort())
    expect(Object.keys(nativeLeg).sort()).toEqual(Object.keys(base).sort())
    expect(() => base.TextLoaderWrapper({})).toThrow(/platform override/)
  })

  it('the root barrel resolves to the renderable web leg under web-first resolution', () => {
    expect(barrel.TextLoaderWrapper).toBe(web.TextLoaderWrapper)
  })
})

describe('web leg', () => {
  it('renders the legacy placeholder DOM around the children', () => {
    const renderer = render(createElement(web.TextLoaderWrapper, undefined, 'loading…'))
    const placeholder = renderer.root.findByProps({ 'data-testid': 'text-placeholder' })
    expect(placeholder.type).toBe('div')
    // The overlay bar carries the legacy surface3 pill classes.
    const overlay = renderer.root
      .findAllByType('div')
      .find((node) => String(node.props['className']).includes(TEXT_PLACEHOLDER_OVERLAY_CLASSES.split(' ')[0]!))
    expect(overlay).toBeDefined()
    expect(String(overlay!.props['className'])).toContain('[background-color:var(--stext-surface3)]')
    expect(renderer.root.findAllByProps({ children: 'loading…' }).length).toBeGreaterThan(0)
  })

  it('wraps the placeholder in the shimmer only when loadingShimmer is set', () => {
    const withShimmer = render(createElement(web.TextLoaderWrapper, { loadingShimmer: true }, 'x'))
    expect(withShimmer.root.findAllByType(ShimmerWeb)).toHaveLength(1)
    const withoutShimmer = render(createElement(web.TextLoaderWrapper, undefined, 'x'))
    expect(withoutShimmer.root.findAllByType(ShimmerWeb)).toHaveLength(0)
  })
})

describe('native leg', () => {
  function findViews(renderer: ReactTestRenderer): ReactTestInstance[] {
    return renderer.root.findAll((node) => String(node.type) === 'RNView')
  }

  it('renders the legacy placeholder view tree: row wrapper, hidden children, surface2 bar', () => {
    const renderer = render(createElement(nativeLeg.TextLoaderWrapper, undefined, 'loading…'))
    const root = renderer.root.findByProps({ testID: 'text-placeholder' })
    expect(root.props['style']).toEqual({ flexDirection: 'row', alignItems: 'center' })

    const hidden = findViews(renderer).find((view) => view.props['accessibilityElementsHidden'] === true)
    expect(hidden).toBeDefined()
    expect(hidden!.props['importantForAccessibility']).toBe('no-hide-descendants')

    const bar = findViews(renderer).find((view) => view.props['className'] === 'bg-surface2')
    expect(bar).toBeDefined()
    expect(bar!.props['style']).toEqual({
      position: 'absolute',
      top: '5%',
      right: 0,
      bottom: '5%',
      left: 0,
      borderRadius: 999999,
    })
  })

  it('wraps the placeholder in the shimmer only when loadingShimmer is set', () => {
    // Under this config the shimmer resolves to its web leg; the wrap/no-wrap
    // wiring is what is pinned here, not the reanimated sweep.
    const withShimmer = render(createElement(nativeLeg.TextLoaderWrapper, { loadingShimmer: true }, 'x'))
    expect(withShimmer.root.findAllByType(ShimmerWeb)).toHaveLength(1)
    const withoutShimmer = render(createElement(nativeLeg.TextLoaderWrapper, undefined, 'x'))
    expect(withoutShimmer.root.findAllByType(ShimmerWeb)).toHaveLength(0)
  })
})
