/**
 * INFRA-3229: pins the platform-leg contract of ViewCompat — the Flex pins
 * minus the Flex variant shorthands (which the plain View never had). Every
 * assertion fails if the native leg is deleted or reverted to the web
 * implementation, which mounted `React.createElement(tag ?? 'div', …)`.
 */
/**
 * SCOPE OF THIS FILE — read before citing it as evidence.
 *
 * This runs under `packages/mycelium/vitest.config.ts`: jsdom, `.web.*` resolved
 * FIRST, and `react-native` replaced by a hand-written stand-in
 * (`../compat/testing/react-native-mock.tsx`). It is therefore an EXPORT-SHAPE and
 * COMPONENT-WIRING pin only — which symbols each leg exports, which host type it
 * mounts, that `tag` is ignored, which props are forwarded, and that the
 * className it attaches is the shared compiler's output byte-for-byte.
 *
 * It is NOT native evidence, and must never be presented as such: no uniwind
 * stylesheet is involved, so nothing here says what those classes RESOLVE to on a
 * device. Every hazard this work is about — a `media-*` variant Tailwind discards,
 * a `w-max` uniwind has no map for, a `[display:inline]` that resolves to
 * `display: "flow"` — is invisible at this level.
 *
 * The native evidence for ViewCompat lives in
 * `packages/tailwind/src/parity/view/native-parity.test.tsx`, which runs under
 * `packages/tailwind/vitest.native.config.ts` (node environment,
 * `TAMAGUI_TARGET=native`, `.native`-first resolution, uniwind's own
 * `compileNativeCSS` pipeline) and asserts on RESOLVED RN style objects.
 */
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetNativeStyleWarnings } from '../compat/native-diagnostics'
import { StyleSheet } from '../compat/testing/react-native-mock'
import { viewCompatClassName } from './compile'
import type { ViewCompatProps } from './props'
// Explicit .tsx extension: the mycelium vitest config resolves `.web.*` first
// (web-first platform splits), which would silently swap the platformless base
// leg for the web leg in this import.
import * as base from './ViewCompat.tsx'
import * as web from './ViewCompat.web'

vi.mock('react-native', () => import('../compat/testing/react-native-mock'))

// react-test-renderer's act() needs the explicit opt-in outside jsdom setups.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function nativeLeg(): Promise<typeof import('./ViewCompat.native')> {
  return import('./ViewCompat.native')
}

interface Mounted {
  host: () => ReactTestInstance
  style: () => Record<string, unknown>
  tree: () => ReactTestRenderer
  unmount: () => void
}

async function renderNative(props: ViewCompatProps, children?: unknown): Promise<Mounted> {
  const { ViewCompat } = await nativeLeg()
  let renderer: ReactTestRenderer | undefined
  act(() => {
    renderer = create(createElement(ViewCompat, props as never, children as never))
  })
  if (renderer === undefined) {
    throw new Error('ViewCompat.native render failed')
  }
  const mounted = renderer
  return {
    host: () => mounted.root.findByType('RNView' as never),
    style: () => StyleSheet.flatten(mounted.root.findByType('RNView' as never).props['style'] as never),
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

describe('export parity', () => {
  it('base, web and native legs export the same symbols', async () => {
    const native = await nativeLeg()
    const baseKeys = Object.keys(base).sort()
    expect(baseKeys).toEqual(['ViewCompat'])
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })

  it('both legs are forwardRef exotic components named ViewCompat', async () => {
    const native = await nativeLeg()
    for (const leg of [web.ViewCompat, native.ViewCompat]) {
      expect(typeof leg).toBe('object')
      expect('render' in leg).toBe(true)
      expect(leg.displayName ?? (leg as unknown as { render: { name: string } }).render.name).toBe('ViewCompat')
    }
  })
})

describe('native leg mounts a React Native host', () => {
  it('renders an RN View, never a DOM element', async () => {
    const mounted = await renderNative({}, 'child')
    expect(mounted.host()).toBeDefined()
    for (const tag of ['div', 'span', 'section']) {
      expect(mounted.tree().root.findAllByType(tag as never)).toHaveLength(0)
    }
    mounted.unmount()
  })

  it('ignores `tag`', async () => {
    const mounted = await renderNative({ tag: 'section' })
    expect(mounted.host()).toBeDefined()
    expect(mounted.host().props['tag']).toBeUndefined()
    mounted.unmount()
  })

  it('forwards the ref to the native host', async () => {
    const { ViewCompat } = await nativeLeg()
    const received: unknown[] = []
    act(() => {
      create(createElement(ViewCompat, { ref: (node: unknown) => received.push(node) } as never))
    })
    expect(received.length).toBeGreaterThan(0)
  })
})

describe('className identity with the web leg', () => {
  const CASES: ViewCompatProps[] = [
    {},
    { flexDirection: 'row', alignItems: 'center' },
    { gap: '$gap8', px: '$spacing16', height: 48 },
    { position: 'absolute', inset: 0, backgroundColor: '$surface2' },
    { display: 'none', flex: 1 },
  ]

  it('attaches exactly the shared pure compiler output', async () => {
    for (const props of CASES) {
      const mounted = await renderNative(props)
      expect(mounted.host().props['className']).toBe(viewCompatClassName(props))
      mounted.unmount()
    }
  })
})

describe('arbitrary numerics land on the RN style object, tokens stay classes', () => {
  it('supplies RN declarations for the runtime-interpolated families', async () => {
    const mounted = await renderNative({
      gap: '$gap8',
      px: '$spacing16',
      height: 48,
      minWidth: '50%',
      flexBasis: 0,
      rowGap: 4,
    })
    expect(mounted.style()).toMatchObject({
      gap: 8,
      paddingHorizontal: 16,
      height: 48,
      minWidth: '50%',
      flexBasis: 0,
      rowGap: 4,
    })
    mounted.unmount()
  })

  it('expands `inset` to the four edge longhands, with explicit edges winning', async () => {
    const mounted = await renderNative({ inset: 8, top: 2 })
    expect(mounted.style()).toMatchObject({ top: 2, right: 8, bottom: 8, left: 8 })
    mounted.unmount()
  })

  it('emits `flex` as grow+shrink longhands, keeping the base basis (Tamagui web semantics)', async () => {
    const mounted = await renderNative({ flex: 1 })
    expect(mounted.style()).toMatchObject({ flexGrow: 1, flexShrink: 1 })
    expect(mounted.style()['flexBasis']).toBeUndefined()
    mounted.unmount()
  })

  it('leaves the flexbox ENUM families to the className — those are literal utilities that do resolve', async () => {
    const mounted = await renderNative({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' })
    const style = mounted.style()
    for (const key of ['flexDirection', 'alignItems', 'justifyContent']) {
      expect(style[key], key).toBeUndefined()
    }
    expect(mounted.host().props['className']).toContain('flex-row')
    expect(mounted.host().props['className']).toContain('items-center')
    expect(mounted.host().props['className']).toContain('justify-between')
    mounted.unmount()
  })

  it('drops sizes with no RN dimension and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const mounted = await renderNative({ width: 'max-content' })
    expect(mounted.style()['width']).toBeUndefined()
    expect(warn.mock.calls.some((call) => String(call[0]).includes('width'))).toBe(true)
    mounted.unmount()
    warn.mockRestore()
  })
})

describe('native prop forwarding', () => {
  it('forwards the RN props and drops the DOM-only ones', async () => {
    const mounted = await renderNative({
      testID: 'view',
      accessibilityLabel: 'label',
      'aria-hidden': true,
      href: 'https://example.com',
      title: 'tooltip',
    })
    expect(mounted.host().props).toMatchObject({ testID: 'view', accessibilityLabel: 'label', 'aria-hidden': true })
    for (const key of ['href', 'title', 'tag']) {
      expect(mounted.host().props[key], key).toBeUndefined()
    }
    mounted.unmount()
  })
})

describe('press props fire on the native leg (INFRA-3536)', () => {
  it('a live onPress claims the responder and dispatches on release, keeping the class lane', async () => {
    const onPress = vi.fn()
    const props = { onPress, gap: '$gap8' } as unknown as ViewCompatProps
    const mounted = await renderNative(props)
    expect((mounted.host().props['onStartShouldSetResponder'] as () => boolean)()).toBe(true)
    const event = { persist: () => undefined }
    act(() => {
      ;(mounted.host().props['onResponderGrant'] as (e: unknown) => void)(event)
      ;(mounted.host().props['onResponderRelease'] as (e: unknown) => void)(event)
    })
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(mounted.host().props['className']).toBe(viewCompatClassName(props))
    mounted.unmount()
  })

  it('carries no wiring and no a11y claim without a live handler; disabled detaches; no implicit a11y when live', async () => {
    const inert = await renderNative({})
    // No responder wiring, no disabled/aria-disabled state (a11y-silent), no
    // pointerEvents override — hit-test semantics stay exactly plain-View.
    expect(inert.host().props['onStartShouldSetResponder']).toBeUndefined()
    expect(inert.host().props['disabled']).toBeUndefined()
    expect(inert.host().props['aria-disabled']).toBeUndefined()
    expect(inert.host().props['accessibilityState']).toBeUndefined()
    expect(inert.host().props['pointerEvents']).toBeUndefined()
    expect(inert.host().props['accessible']).toBeUndefined()
    expect(inert.host().props['focusable']).toBeUndefined()
    expect(inert.host().props['accessibilityRole']).toBeUndefined()
    inert.unmount()

    // A live tap target contributes no implicit a11y props either — legacy
    // Tamagui parity; an implicit accessible would flatten the a11y subtree.
    const live = await renderNative({ onPress: vi.fn() } as unknown as ViewCompatProps)
    expect(live.host().props['accessible']).toBeUndefined()
    expect(live.host().props['focusable']).toBeUndefined()
    expect(live.host().props['accessibilityRole']).toBeUndefined()
    live.unmount()

    const disabled = await renderNative({ disabled: true, onPress: vi.fn() } as unknown as ViewCompatProps)
    expect(disabled.host().props['onStartShouldSetResponder']).toBeUndefined()
    // The USER's disabled still maps through nativeCompatProps, as everywhere.
    expect(disabled.host().props['accessibilityState']).toEqual({ disabled: true })
    disabled.unmount()
  })
})

describe('onLayout', () => {
  it('passes the caller handler straight to RN onLayout (no ResizeObserver lane)', async () => {
    const onLayout = vi.fn()
    const mounted = await renderNative({ onLayout })
    expect(mounted.host().props['onLayout']).toBe(onLayout)
    const event = { nativeEvent: { layout: { x: 1, y: 2, width: 3, height: 4 } } }
    act(() => {
      ;(mounted.host().props['onLayout'] as (e: unknown) => void)(event)
    })
    expect(onLayout).toHaveBeenCalledWith(event)
    mounted.unmount()
  })
})
