/**
 * INFRA-3229: pins the platform-leg contract of TextCompat — the only one of
 * the three primitives that is not a bare `createCompatComponent` call, and the
 * one carrying the sharpest native hazard: `BASE_CLASSES` opens with
 * `[display:inline]`, which uniwind resolves to `display: "flow"` on native
 * (measured) — not a valid RN display value, on EVERY native Text.
 *
 * Every assertion fails if the native leg is deleted or reverted to the web
 * implementation, which mounted `h1`/`h2`/`h3`/`span` DOM hosts.
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
 * The native evidence for TextCompat lives in
 * `packages/tailwind/src/parity/text/native-parity.test.tsx`, which runs under
 * `packages/tailwind/vitest.native.config.ts` (node environment,
 * `TAMAGUI_TARGET=native`, `.native`-first resolution, uniwind's own
 * `compileNativeCSS` pipeline) and asserts on RESOLVED RN style objects.
 */
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetNativeStyleWarnings } from '../compat/native-diagnostics'
import { PRESS_HANDLER_KEYS } from '../compat/native-props'
import { StyleSheet } from '../compat/testing/react-native-mock'
import { Shimmer as ShimmerWeb } from '../shimmer/Shimmer.web'
import { TextLoaderWrapper as TextLoaderWrapperNative } from '../text-loader-wrapper/TextLoaderWrapper.native'
import { textCompatClassName } from './compile'
import { stripNonNativeDisplayClasses } from './native-style'
import type { TextCompatProps } from './props'
// Explicit .tsx extension: the mycelium vitest config resolves `.web.*` first
// (web-first platform splits), which would silently swap the platformless base
// leg for the web leg in this import.
import * as base from './TextCompat.tsx'
import * as web from './TextCompat.web'

vi.mock('react-native', () => import('../compat/testing/react-native-mock'))

// react-test-renderer's act() needs the explicit opt-in outside jsdom setups.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function nativeLeg(): Promise<typeof import('./TextCompat.native')> {
  return import('./TextCompat.native')
}

interface Mounted {
  host: () => ReactTestInstance
  style: () => Record<string, unknown>
  tree: () => ReactTestRenderer
  unmount: () => void
}

async function renderNative(props: TextCompatProps, children?: unknown): Promise<Mounted> {
  const { TextCompat } = await nativeLeg()
  let renderer: ReactTestRenderer | undefined
  act(() => {
    renderer = create(createElement(TextCompat, props as never, children as never))
  })
  if (renderer === undefined) {
    throw new Error('TextCompat.native render failed')
  }
  const mounted = renderer
  return {
    host: () => mounted.root.findByType('RNText' as never),
    style: () => StyleSheet.flatten(mounted.root.findByType('RNText' as never).props['style'] as never),
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
    // `text-compat/index.ts` re-exports both, so a missing
    // `resolveTextCompatDefaults` on native breaks the subpath barrel on Metro.
    expect(baseKeys).toEqual(['TextCompat', 'resolveTextCompatDefaults'])
    expect(Object.keys(web).sort()).toEqual(baseKeys)
    expect(Object.keys(native).sort()).toEqual(baseKeys)
  })

  it('both legs are forwardRef exotic components named TextCompat', async () => {
    const native = await nativeLeg()
    for (const leg of [web.TextCompat, native.TextCompat]) {
      expect(typeof leg).toBe('object')
      expect('render' in leg).toBe(true)
      expect(leg.displayName ?? (leg as unknown as { render: { name: string } }).render.name).toBe('TextCompat')
    }
  })

  it('both legs resolve the same defaults', async () => {
    const native = await nativeLeg()
    const args = { loading: false as const, props: {} }
    expect(native.resolveTextCompatDefaults(args)).toEqual(web.resolveTextCompatDefaults(args))
  })
})

describe('native leg mounts a React Native host', () => {
  it('renders an RN Text, never a DOM element', async () => {
    const mounted = await renderNative({}, 'hello')
    expect(mounted.host()).toBeDefined()
    for (const tag of ['span', 'div', 'h1', 'h2', 'h3']) {
      expect(mounted.tree().root.findAllByType(tag as never)).toHaveLength(0)
    }
    mounted.unmount()
  })

  it('ignores the variant→tag table AND the `tag` prop', async () => {
    // On web `variant="heading1"` renders an <h1>; RN has no tags.
    const heading = await renderNative({ variant: 'heading1' }, 'title')
    expect(heading.host()).toBeDefined()
    expect(heading.tree().root.findAllByType('h1' as never)).toHaveLength(0)
    heading.unmount()

    const tagged = await renderNative({ tag: 'section' })
    expect(tagged.host()).toBeDefined()
    expect(tagged.host().props['tag']).toBeUndefined()
    tagged.unmount()
  })

  it('forwards the ref to the native host', async () => {
    const { TextCompat } = await nativeLeg()
    const received: unknown[] = []
    act(() => {
      create(createElement(TextCompat, { ref: (node: unknown) => received.push(node) } as never))
    })
    expect(received.length).toBeGreaterThan(0)
  })
})

describe('the [display:inline] hazard', () => {
  it('the compiler still emits it (web parity depends on it byte-for-byte)', () => {
    expect(textCompatClassName({})).toContain('[display:inline]')
  })

  it('the native leg does NOT attach it — uniwind resolves it to display:"flow"', async () => {
    const mounted = await renderNative({})
    const className = mounted.host().props['className'] as string
    expect(className).not.toContain('[display:inline]')
    // Everything else the compiler produced is still there.
    expect(className).toBe(stripNonNativeDisplayClasses(textCompatClassName({ variant: 'body2', color: '$neutral1' })))
    mounted.unmount()
  })

  it('strips every non-RN display value while keeping flex/none/contents', () => {
    expect(stripNonNativeDisplayClasses('[display:inline] m-0 [display:-webkit-box] [display:inline-flex]')).toBe('m-0')
    expect(stripNonNativeDisplayClasses('[display:flex] [display:none] [display:contents]')).toBe(
      '[display:flex] [display:none] [display:contents]',
    )
  })

  it('drops the -webkit-box display the numberOfLines>1 lane emits', async () => {
    const mounted = await renderNative({ numberOfLines: 3 }, 'long')
    expect(mounted.host().props['className']).not.toContain('[display:-webkit-box]')
    mounted.unmount()
  })

  it('drops a pool-scoped display too — the prefixed token bypassed the anchored match', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const props = {
      '$theme-dark': { display: 'grid' },
      $md: { display: 'inline-flex' },
    } as unknown as TextCompatProps
    // The compiler still emits the prefixed tokens (web parity depends on it)…
    const compiled = textCompatClassName({ variant: 'body2', ...props })
    expect(compiled).toContain('dark:[display:grid]')
    expect(compiled).toContain('media-md:[display:inline-flex]')
    // …and the leg attaches neither: unstripped, dark:[display:grid] resolves
    // to display:"grid" in Yoga whenever the class gains a bundle entry.
    const mounted = await renderNative(props)
    const className = mounted.host().props['className'] as string
    expect(className).not.toContain('dark:[display:grid]')
    expect(className).not.toContain('media-md:[display:inline-flex]')
    const warned = warn.mock.calls.map((call) => String(call[0])).join('\n')
    for (const name of ['$theme-dark.display', '$md.display']) {
      expect(warned, name).toContain(name)
    }
    mounted.unmount()
    warn.mockRestore()
  })

  it('keeps a pool-scoped RN-valid display — dark:[display:none] still resolves natively', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const mounted = await renderNative({ '$theme-dark': { display: 'none' } } as unknown as TextCompatProps)
    expect(mounted.host().props['className']).toContain('dark:[display:none]')
    expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).not.toContain('.display')
    mounted.unmount()
    warn.mockRestore()
  })
})

describe('typography lands on the RN style object', () => {
  it('resolves the variant ramp — the class lane is runtime-interpolated and invisible to the scanner', async () => {
    // Metrics under this config are the `smallFont: true` column (jsdom resolves
    // native-font-environment.web.ts): identical to the web ramp except the
    // scaled line-heights carry the raw float legacy native computes (the
    // generated web mirror rounds; native Tamagui does not — measured).
    const mounted = await renderNative({ variant: 'body2' }, 'x')
    // Without this the native Text would render at RN's default size — and,
    // before INFRA-3461, in the system font: the platform Basel mapping is the
    // style lane's job too (`--stext-font-*` has no native counterpart).
    expect(mounted.style()).toMatchObject({
      fontSize: 16,
      lineHeight: 22,
      fontFamily: 'Basel Grotesk',
      fontWeight: '400',
    })
    mounted.unmount()

    const heading = await renderNative({ variant: 'heading3' }, 'x')
    expect(heading.style()).toMatchObject({
      fontSize: 24,
      lineHeight: 28,
      fontFamily: 'Basel Grotesk',
      fontWeight: '400',
    })
    heading.unmount()
  })

  it('explicit typography props override the variant, matching tailwind-merge precedence', async () => {
    const mounted = await renderNative({ variant: 'body2', fontSize: 13, lineHeight: 18, letterSpacing: -0.2 }, 'x')
    expect(mounted.style()).toMatchObject({ fontSize: 13, lineHeight: 18, letterSpacing: -0.2 })
    mounted.unmount()
  })

  it('drops a `$` token letterSpacing instead of resolving it through the font SIZES table', async () => {
    // REGRESSION PIN. `letterSpacing` is typed `number | string`, and the class lane
    // sends any non-numeric value straight to `arbitrary()`, so a token compiles to a
    // `[letter-spacing:…]` property carrying the raw token — not a valid CSS length,
    // inert on web. Deliberately not spelled as a literal here: this file is inside
    // the scanned `@source` tree, so the spelling alone would put the class in the
    // native bundle (see FONT_WEIGHT_SCANNER_FRAGILITY_REASON). The style
    // lane used to resolve the same value through the font SIZES table, which the
    // class lane never does: `$large` landed the body font's 18px SIZE as tracking
    // on device, and `$none` / `$spacing8` (absent from `sizes` AND from
    // VARIANT_METRICS) THREW `unknown fontSize token` mid-render, native only.
    for (const letterSpacing of ['$large', '$small', '$none', '$spacing8']) {
      __resetNativeStyleWarnings()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      // Rendering at all is half the pin: `$none` used to throw from inside render.
      const mounted = await renderNative({ letterSpacing } as TextCompatProps, 'x')
      expect(mounted.style()['letterSpacing'], letterSpacing).toBeUndefined()
      expect(warn.mock.calls.map((call) => String(call[0])).join('\n'), letterSpacing).toContain('letterSpacing')
      mounted.unmount()
      warn.mockRestore()
    }
  })

  it('still lands a numeric and a px-string letterSpacing — those are real RN values', async () => {
    for (const [letterSpacing, expected] of [
      [-0.2, -0.2],
      ['0.5px', 0.5],
      ['-1.25px', -1.25],
    ] as const) {
      const mounted = await renderNative({ letterSpacing } as TextCompatProps, 'x')
      expect(mounted.style()['letterSpacing'], String(letterSpacing)).toBe(expected)
      mounted.unmount()
    }
  })

  it("lineHeight: 'unset' skips the variant line-height (the Vietnamese diacritics escape hatch)", async () => {
    const mounted = await renderNative({ variant: 'body2', lineHeight: 'unset' }, 'x')
    expect(mounted.style()['lineHeight']).toBeUndefined()
    mounted.unmount()
  })

  it('resolves font-relative size tokens against the element font context', async () => {
    const mounted = await renderNative({ fontFamily: '$body', fontSize: '$small' }, 'x')
    expect(mounted.style()['fontSize']).toBe(14)
    mounted.unmount()
  })

  it('leaves theme color tokens on the className (the only theme-reactive lane)', async () => {
    const mounted = await renderNative({ color: '$neutral1' }, 'x')
    expect(mounted.style()['color']).toBeUndefined()
    expect(mounted.host().props['className']).toContain('[color:var(--stext-neutral1)]')
    mounted.unmount()
  })

  it('puts raw colors on the style object', async () => {
    const mounted = await renderNative({ color: '#131313' }, 'x')
    expect(mounted.style()['color']).toBe('#131313')
    mounted.unmount()
  })

  it('maps the app font weights onto the Basel face pair instead of dropping them (INFRA-3453/INFRA-3461)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    // Variant-derived weight lands as the native '400'/'500' (RN expresses the
    // 485/535 web weights through the font FILES), with no warn.
    const variant = await renderNative({ variant: 'buttonLabel2' }, 'x')
    expect(variant.style()['fontWeight']).toBe('500')
    expect(variant.style()['fontFamily']).toBe('Basel Grotesk')
    variant.unmount()

    // An explicit token weight resolves the same way — the INFRA-3453 case:
    // rebuilt text used to render regular because '$medium' dropped.
    const explicit = await renderNative({ fontWeight: '$medium' }, 'x')
    expect(explicit.style()['fontWeight']).toBe('500')
    expect(explicit.style()['fontFamily']).toBe('Basel Grotesk')
    explicit.unmount()
    expect(warn.mock.calls.some((call) => String(call[0]).includes('fontWeight'))).toBe(false)

    // A medium-family variant demoted to '400' keeps the family and lands the
    // weight — measured legacy: iOS keeps the embedded name (CoreText draws
    // Book), Android keeps the Medium FILE (fonts.ts `face` only exists on the
    // book fonts; the swap is one-directional — pinned per platform in
    // native-font.test.ts). This config's environment is ios.
    const demoted = await renderNative({ variant: 'buttonLabel2', fontWeight: '400' }, 'x')
    expect(demoted.style()['fontWeight']).toBe('400')
    expect(demoted.style()['fontFamily']).toBe('Basel Grotesk')
    demoted.unmount()

    // An RN-expressible weight passes through, keeping its input type so both
    // lanes read the same value (the class lane resolves `[font-weight:600]` to
    // a number).
    const rnWeight = await renderNative({ fontWeight: 600 }, 'x')
    expect(rnWeight.style()['fontWeight']).toBe(600)
    const rnWeightString = await renderNative({ fontWeight: '700' }, 'x')
    expect(rnWeightString.style()['fontWeight']).toBe('700')
    rnWeightString.unmount()
    rnWeight.unmount()

    // The NUMERIC spellings of the app weights pass through verbatim — legacy
    // native Tamagui neither drops nor face-maps them (measured via
    // renderTamaguiNative: the raw number lands in the RN style and iOS
    // CoreText picks the nearest Basel face), so `fontWeight={535}` must
    // render exactly like legacy, not fall back to the variant's Book '400'.
    const numericMedium = await renderNative({ variant: 'body2', fontWeight: 535 }, 'x')
    expect(numericMedium.style()['fontWeight']).toBe(535)
    expect(numericMedium.style()['fontFamily']).toBe('Basel Grotesk')
    numericMedium.unmount()
    const numericBook = await renderNative({ variant: 'body2', fontWeight: 485 }, 'x')
    expect(numericBook.style()['fontWeight']).toBe(485)
    expect(numericBook.style()['fontFamily']).toBe('Basel Grotesk')
    numericBook.unmount()
    // The string spelling keeps its input type, like the other pass-throughs.
    const stringMedium = await renderNative({ fontWeight: '535' }, 'x')
    expect(stringMedium.style()['fontWeight']).toBe('535')
    stringMedium.unmount()
    expect(warn.mock.calls.some((call) => String(call[0]).includes('fontWeight'))).toBe(false)

    // fontWeight authored BEFORE the variant loses to it (INFRA-3457's
    // insertion-ordered winner, `fontWeightWinsOverVariant`) — the native
    // mirror of the web pin in
    // `packages/tailwind/src/parity/text/font-weight.parity.test.tsx`
    // ("out-of-scale '600' authored BEFORE the variant loses to it
    // (INFRA-3189)"). That suite pins the WEB class weight (535, Basel
    // Medium's web literal); the style lane resolves through the NATIVE ramp
    // instead (INFRA-3461: RN expresses the app weights via the Basel FACE
    // pair, '400'/'500', not the 485/535 web literals), so the resolved
    // number here is buttonLabel2's native '500', never the authored 600 nor
    // the web-scale 535.
    const beforeVariant = await renderNative({ fontWeight: '600', variant: 'buttonLabel2' }, 'x')
    expect(beforeVariant.style()['fontWeight']).toBe('500')
    expect(beforeVariant.style()['fontFamily']).toBe('Basel Grotesk')
    beforeVariant.unmount()

    // A weight that is neither an app token nor RN-legal still drops and warns
    // — the default variant's own '400' stays in place.
    const invalid = await renderNative({ fontWeight: 'lighter' } as unknown as TextCompatProps, 'x')
    expect(invalid.style()['fontWeight']).toBe('400')
    expect(warn.mock.calls.some((call) => String(call[0]).includes('fontWeight'))).toBe(true)
    invalid.unmount()
    warn.mockRestore()
  })

  it('maps token fontFamily to the platform Basel name and keeps raw families verbatim', async () => {
    // `$body`/`$heading` → the iOS embedded family name under this config's
    // environment (native-font-environment.web.ts pins ios); Android naming is
    // pinned per variant in native-font.test.ts.
    const token = await renderNative({ fontFamily: '$body' }, 'x')
    expect(token.style()['fontFamily']).toBe('Basel Grotesk')
    token.unmount()

    const mono = await renderNative({ fontFamily: '$monospace' }, 'x')
    expect(mono.style()['fontFamily']).toBe('InputMono-Regular')
    mono.unmount()

    const raw = await renderNative({ fontFamily: 'Inter' }, 'x')
    expect(raw.style()['fontFamily']).toBe('Inter')
    raw.unmount()
  })

  it('keeps the text enum families on the className — those are literal utilities', async () => {
    const mounted = await renderNative({ textAlign: 'center', textTransform: 'uppercase' }, 'x')
    expect(mounted.style()['textAlign']).toBeUndefined()
    expect(mounted.host().props['className']).toContain('text-center')
    expect(mounted.host().props['className']).toContain('uppercase')
    mounted.unmount()
  })
})

describe('truncation uses RN props, not -webkit classes', () => {
  it('forwards numberOfLines and ellipsizeMode', async () => {
    const mounted = await renderNative({ numberOfLines: 2, ellipsizeMode: 'middle' }, 'long text')
    expect(mounted.host().props['numberOfLines']).toBe(2)
    expect(mounted.host().props['ellipsizeMode']).toBe('middle')
    mounted.unmount()
  })

  it('maps the `ellipse`/`ellipsis` variants onto numberOfLines={1}', async () => {
    for (const props of [{ ellipse: true }, { ellipsis: true }] as TextCompatProps[]) {
      const mounted = await renderNative(props, 'long text')
      expect(mounted.host().props['numberOfLines']).toBe(1)
      mounted.unmount()
    }
  })

  it('forwards the rest of TextCompatExtraProps — real RN Text props, inert on web', async () => {
    const onTextLayout = vi.fn()
    const mounted = await renderNative({
      selectable: true,
      allowFontScaling: false,
      maxFontSizeMultiplier: 1.4,
      adjustsFontSizeToFit: true,
      minimumFontScale: 0.5,
      suppressHighlighting: true,
      onTextLayout,
    })
    expect(mounted.host().props).toMatchObject({
      selectable: true,
      allowFontScaling: false,
      maxFontSizeMultiplier: 1.4,
      adjustsFontSizeToFit: true,
      minimumFontScale: 0.5,
      suppressHighlighting: true,
      onTextLayout,
    })
    mounted.unmount()
  })
})

describe('loading placeholder — delegated to the native TextLoaderWrapper (INFRA-3620)', () => {
  it('renders the RN placeholder chrome sized by the placeholder text, never DOM divs', async () => {
    const mounted = await renderNative({ loading: 'no-shimmer' }, 'real children')
    expect(mounted.tree().root.findAllByType(TextLoaderWrapperNative as never)).toHaveLength(1)
    expect(mounted.tree().root.findAllByType('RNView' as never).length).toBeGreaterThan(0)
    expect(mounted.tree().root.findAllByType('div' as never)).toHaveLength(0)
    // Children must not render while loading; the placeholder text sizes the bar.
    expect(mounted.host().props['children']).toBe('000.00')
    mounted.unmount()
  })

  it('paints the bar the legacy NATIVE surface2 (a semantic class, so Uniwind.setTheme() switches it)', async () => {
    const mounted = await renderNative({ loading: true })
    const views = mounted.tree().root.findAllByType('RNView' as never)
    expect(views.find((node) => node.props['className'] === 'bg-surface2')).toBeDefined()
    expect(views.find((node) => node.props['className'] === 'bg-surface3')).toBeUndefined()
    mounted.unmount()
  })

  it('hides the bar-sizing Text from screen readers, like the legacy HiddenFromScreenReaders', async () => {
    const mounted = await renderNative({ loading: true })
    const hidden = mounted
      .tree()
      .root.findAllByType('RNView' as never)
      .find((node) => node.props['accessibilityElementsHidden'] === true)
    expect(hidden).toBeDefined()
    expect(hidden!.props['importantForAccessibility']).toBe('no-hide-descendants')
    mounted.unmount()
  })

  it("wraps the chrome in the Shimmer sweep unless `loading='no-shimmer'`, like the legacy Shine", async () => {
    // Under this web-first config the wrapper's Shimmer resolves to its web
    // leg; the wrap/no-wrap wiring is what is pinned here — the reanimated
    // sweep itself is native-harness evidence (packages/tailwind parity).
    const shimmer = await renderNative({ loading: true })
    expect(shimmer.tree().root.findAllByType(ShimmerWeb as never)).toHaveLength(1)
    shimmer.unmount()
    const noShimmer = await renderNative({ loading: 'no-shimmer' })
    expect(noShimmer.tree().root.findAllByType(ShimmerWeb as never)).toHaveLength(0)
    noShimmer.unmount()
  })
})

describe('press props fire on the native leg (INFRA-3536)', () => {
  it('forwards every behavioral press handler to RN Text, whose pressability dispatches them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const handlers = Object.fromEntries(PRESS_HANDLER_KEYS.map((key) => [key, vi.fn()]))
    const mounted = await renderNative(handlers as TextCompatProps, 'tap me')
    for (const key of PRESS_HANDLER_KEYS) {
      act(() => {
        ;(mounted.host().props[key] as (event: unknown) => void)({})
      })
      expect(handlers[key], key).toHaveBeenCalledTimes(1)
    }
    // The handlers are no longer in the dead-prop ledger: no dev warning.
    expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).not.toContain('onPress')
    mounted.unmount()
    warn.mockRestore()
  })

  it('forces the responder on for a pressIn/pressOut-only call site (RN Text installs it only for onPress/onLongPress)', async () => {
    const onPressIn = vi.fn()
    const mounted = await renderNative({ onPressIn } as unknown as TextCompatProps, 'x')
    // The no-op onPress exists solely to flip RN Text's `isPressable` gate —
    // without it the forwarded onPressIn would never fire on device (legacy
    // Tamagui's attachPress gate includes the pressIn/pressOut pair).
    expect(typeof mounted.host().props['onPress']).toBe('function')
    act(() => {
      ;(mounted.host().props['onPressIn'] as (event: unknown) => void)({})
    })
    expect(onPressIn).toHaveBeenCalledTimes(1)
    mounted.unmount()

    // With a real onPress there is nothing to force — the caller's own handler forwards.
    const onPress = vi.fn()
    const real = await renderNative({ onPress } as unknown as TextCompatProps, 'x')
    act(() => {
      ;(real.host().props['onPress'] as (event: unknown) => void)({})
    })
    expect(onPress).toHaveBeenCalledTimes(1)
    real.unmount()
  })

  it('a runtime onPress={null} attaches nothing (attachPress gate), and disabled detaches the surface', async () => {
    const nulled = await renderNative({ onPress: null } as unknown as TextCompatProps, 'x')
    expect(nulled.host().props['onPress']).toBeUndefined()
    nulled.unmount()

    const disabled = await renderNative({ disabled: true, onPress: vi.fn() } as unknown as TextCompatProps, 'x')
    expect(disabled.host().props['onPress']).toBeUndefined()
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
