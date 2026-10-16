/**
 * Platform-leg contract for the ScrollView compat, following
 * `view-compat/platform-legs.test.ts`.
 *
 * SCOPE: export-shape and component-wiring pins only (see the view-compat
 * header) — jsdom, `.web.*` first, `react-native` replaced by a stand-in, so
 * nothing here says what the classes resolve to on a device. What it proves:
 * base ≡ web, native exports the same symbol set, the native leg mounts a
 * real RN ScrollView (never a DOM host, never the web scroll synthesis),
 * forwards the RN scroll surface verbatim, compiles ONLY the caller's style
 * pools into the className (the RN host owns its base), and rides the
 * two-lane contentContainerStyle split.
 */
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetNativeStyleWarnings } from '../compat/native-diagnostics'
import { StyleSheet } from '../compat/testing/react-native-mock'
import { nativeScrollViewCompatClassName } from './compile'
import type { ScrollViewCompatProps } from './props'
// Explicit .tsx extension: this vitest config resolves `.web.*` first, which
// would silently swap the platformless base leg for the web leg here.
import * as base from './ScrollViewCompat.tsx'
import * as web from './ScrollViewCompat.web'

vi.mock('react-native', () => import('./testing/react-native-mock'))

// react-test-renderer's act() needs the explicit opt-in outside jsdom setups.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function nativeLeg(): Promise<typeof import('./ScrollViewCompat.native')> {
  return import('./ScrollViewCompat.native')
}

interface Mounted {
  host: () => ReactTestInstance
  style: () => Record<string, unknown>
  tree: () => ReactTestRenderer
  unmount: () => void
}

async function renderNative(props: ScrollViewCompatProps, children?: unknown): Promise<Mounted> {
  const { ScrollViewCompat } = await nativeLeg()
  let renderer: ReactTestRenderer | undefined
  act(() => {
    renderer = create(createElement(ScrollViewCompat, props as never, children as never))
  })
  if (renderer === undefined) {
    throw new Error('ScrollViewCompat.native render failed')
  }
  const mounted = renderer
  return {
    host: () => mounted.root.findByType('RNScrollView' as never),
    style: () => StyleSheet.flatten(mounted.root.findByType('RNScrollView' as never).props['style'] as never),
    tree: () => mounted,
    unmount: (): void => {
      act(() => {
        mounted.unmount()
      })
    },
  }
}

beforeEach(() => {
  __resetNativeStyleWarnings()
})

describe('base leg re-exports the web leg', () => {
  it('ScrollViewCompat', () => {
    expect(base.ScrollViewCompat).toBe(web.ScrollViewCompat)
  })
})

describe('export parity across the legs', () => {
  it('the native leg exports exactly the base leg symbol set', async () => {
    const native = await nativeLeg()
    expect(Object.keys(native).sort()).toEqual(Object.keys(base).sort())
    expect(Object.keys(native)).toContain('ScrollViewCompat')
  })

  it('both legs carry the mycelium primitive marker (the $accent3-injection crash vector)', async () => {
    const native = await nativeLeg()
    const { isMyceliumPrimitive } = await import('../compat/primitive-marker')
    expect(isMyceliumPrimitive(web.ScrollViewCompat)).toBe(true)
    expect(isMyceliumPrimitive(native.ScrollViewCompat)).toBe(true)
  })

  it('the native leg is NOT the web leg (a real split, not an accidental alias)', async () => {
    const native = await nativeLeg()
    expect(native.ScrollViewCompat).not.toBe(web.ScrollViewCompat)
  })
})

describe('native leg mounts a React Native ScrollView', () => {
  it('renders an RN ScrollView, never a DOM element or nested content div', async () => {
    const mounted = await renderNative({}, 'child')
    expect(mounted.host()).toBeDefined()
    for (const tag of ['div', 'span']) {
      expect(mounted.tree().root.findAllByType(tag as never)).toHaveLength(0)
    }
    mounted.unmount()
  })

  it('forwards the ref to the native host', async () => {
    const { ScrollViewCompat } = await nativeLeg()
    const received: unknown[] = []
    act(() => {
      create(createElement(ScrollViewCompat, { ref: (node: unknown) => received.push(node) } as never))
    })
    expect(received.length).toBeGreaterThan(0)
  })
})

describe('RN scroll surface forwarding', () => {
  it('forwards the scroll props verbatim (the held call sites: horizontal fade row)', async () => {
    const onScroll = vi.fn()
    const onContentSizeChange = vi.fn()
    const mounted = await renderNative({
      horizontal: true,
      scrollEventThrottle: 16,
      showsHorizontalScrollIndicator: false,
      onScroll,
      onContentSizeChange,
      keyboardShouldPersistTaps: 'handled',
      bounces: false,
    } as ScrollViewCompatProps)
    expect(mounted.host().props).toMatchObject({
      horizontal: true,
      scrollEventThrottle: 16,
      showsHorizontalScrollIndicator: false,
      keyboardShouldPersistTaps: 'handled',
      bounces: false,
    })
    expect(mounted.host().props['onScroll']).toBe(onScroll)
    expect(mounted.host().props['onContentSizeChange']).toBe(onContentSizeChange)
    mounted.unmount()
  })

  it('forwards the props from the original oversell finding: scrollPerfTag and onScrollAnimationEnd', async () => {
    const onScrollAnimationEnd = vi.fn()
    const mounted = await renderNative({ scrollPerfTag: 'probe', onScrollAnimationEnd } as ScrollViewCompatProps)
    expect(mounted.host().props['scrollPerfTag']).toBe('probe')
    expect(mounted.host().props['onScrollAnimationEnd']).toBe(onScrollAnimationEnd)
    mounted.unmount()
  })

  it('drops the DOM-only compat surface by omission', async () => {
    const mounted = await renderNative({ tag: 'section', href: 'https://example.com', title: 'tooltip' })
    for (const key of ['tag', 'href', 'title']) {
      expect(mounted.host().props[key], key).toBeUndefined()
    }
    mounted.unmount()
  })
})

describe('className carries only the caller style pools (the RN host owns its base)', () => {
  it('attaches exactly the native compiler output, empty for bare props', async () => {
    const bare = await renderNative({})
    expect(bare.host().props['className']).toBe('')
    bare.unmount()

    const props: ScrollViewCompatProps = { backgroundColor: '$surface2', flexGrow: 1 }
    const styled = await renderNative(props)
    expect(styled.host().props['className']).toBe(nativeScrollViewCompatClassName(props))
    expect(String(styled.host().props['className'])).toContain('bg-surface2')
    styled.unmount()
  })

  it('compiles the fullscreen variant under the caller props', async () => {
    const mounted = await renderNative({ fullscreen: true })
    const className = String(mounted.host().props['className'])
    expect(className).toContain('absolute')
    expect(className).toContain('top-[0px]')
    mounted.unmount()
  })

  it('supplies RN declarations for the runtime-interpolated families', async () => {
    const mounted = await renderNative({ maxHeight: 300, px: '$spacing16' })
    expect(mounted.style()).toMatchObject({ maxHeight: 300, paddingHorizontal: 16 })
    mounted.unmount()
  })
})

describe('contentContainerStyle rides the two-lane split', () => {
  it('compiles enum/token families to contentContainerClassName and interpolated ones to the RN style object', async () => {
    const mounted = await renderNative({
      contentContainerStyle: { flexDirection: 'row', gap: '$gap8', paddingBottom: 33 },
    })
    const host = mounted.host()
    expect(String(host.props['contentContainerClassName'])).toContain('flex-row')
    expect(StyleSheet.flatten(host.props['contentContainerStyle'] as never)).toMatchObject({
      gap: 8,
      paddingBottom: 33,
    })
    mounted.unmount()
  })

  it(
    'does not misclassify contentContainerStyle as a typo’d pseudo pool key when the frame compiles ' +
      '(INFRA-3260 regression: an object-valued *Style-suffixed own-prop unrelated to the pseudo pool)',
    () => {
      expect(() =>
        nativeScrollViewCompatClassName({
          contentContainerStyle: { gap: '$gap8' },
        } as ScrollViewCompatProps),
      ).not.toThrow()
    },
  )

  it("still rejects a genuinely typo'd pseudo pool key at the top level (hoverStyles for hoverStyle)", () => {
    expect(() => nativeScrollViewCompatClassName({ hoverStyles: { gap: 8 } } as ScrollViewCompatProps)).toThrow(
      /unknown pseudo-state prop "hoverStyles"/,
    )
  })
})

describe('onLayout', () => {
  it('passes the caller handler straight to RN onLayout (no ResizeObserver lane)', async () => {
    const onLayout = vi.fn()
    const mounted = await renderNative({ onLayout })
    expect(mounted.host().props['onLayout']).toBe(onLayout)
    mounted.unmount()
  })
})
