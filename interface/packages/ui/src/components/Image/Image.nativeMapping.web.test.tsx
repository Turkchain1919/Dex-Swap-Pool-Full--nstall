import { render } from '@testing-library/react'
import { MyceliumThemeTestWrapper } from '@universe/mycelium/testing'
import { type ReactNode } from 'react'
// Type-only: erased at runtime, so it cannot defeat the mocks the runtime import waits for.
import type { ImageProps } from 'ui/src/components/Image/Image'
import { describe, expect, it, vi } from 'vitest'

// Force the native leg of the platform split: the module chooses its press wiring,
// objectFit expansion, and web-CSS gating from the RENDERER (react-native's Platform.OS)
// at load time; the app-level flag below only picks the $xs breakpoint hook.
vi.mock('@universe/environment', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return { ...original, isWebPlatform: false }
})

// Pin the props the component hands the RN Image host, without rendering react-native-web's
// DOM (the native leg is not renderable under jsdom; the contract IS the props). Statics are
// carried over so the module-load Object.assign keeps working. Platform.OS reports a native
// renderer so the module binds its native style pipeline.
const capturedProps: Record<string, unknown>[] = []
vi.mock('react-native', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-native')>()
  function CapturingImage(props: Record<string, unknown>): null {
    capturedProps.push(props)
    return null
  }
  Object.assign(CapturingImage, original.Image)
  return { ...original, Image: CapturingImage, Platform: { ...original.Platform, OS: 'ios' } }
})

// Import AFTER the mocks so the module binds the native flag and the capturing host.
const { Image } = await import('ui/src/components/Image/Image')

function Providers({ children }: { children: ReactNode }): JSX.Element {
  return <MyceliumThemeTestWrapper theme="light">{children}</MyceliumThemeTestWrapper>
}

function lastProps(): Record<string, unknown> {
  const props = capturedProps.at(-1)
  if (!props) {
    throw new Error('RN Image host was not rendered')
  }
  return props
}

function flatStyle(props: Record<string, unknown>): Record<string, unknown> {
  const style = props['style'] as unknown[]
  return Object.assign({}, ...(Array.isArray(style) ? style : [style]).filter(Boolean))
}

const URI = 'https://images.test/asset.png'

describe('Image native prop mapping (RN host contract)', () => {
  it('direct onPress attaches responder-based press handlers, never a raw touch handler', () => {
    // Legacy Tamagui attached RN Pressability's responder handlers to this same host view.
    // A bare onTouchEnd would also fire at the end of a drag/scroll ending on the image —
    // press semantics require the responder path, where a scroll or sheet gesture claiming
    // the responder terminates (cancels) the press before release.
    const onPress = vi.fn()
    render(
      <Providers>
        <Image source={{ uri: URI }} width={20} height={20} onPress={onPress} />
      </Providers>,
    )
    const props = lastProps()
    expect(props['onTouchEnd'], 'no raw onTouchEnd press mapping').toBeUndefined()
    expect(props['onClick'], 'no web onClick on native').toBeUndefined()

    const shouldSet = props['onStartShouldSetResponder'] as () => boolean
    const release = props['onResponderRelease'] as (event: unknown) => void
    const terminationRequest = props['onResponderTerminationRequest'] as () => boolean
    expect(typeof shouldSet, 'onStartShouldSetResponder').toBe('function')
    expect(typeof release, 'onResponderRelease').toBe('function')
    expect(shouldSet(), 'claims the start responder').toBe(true)
    expect(terminationRequest(), 'lets scroll/gesture ancestors steal the responder (press-cancel)').toBe(true)

    const event = { nativeEvent: {} }
    release(event)
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledWith(event)
  })

  it('a drag that lifts off the image does not fire onPress (Pressability press rect)', () => {
    // Legacy pressed through RN Pressability: RESPONDER_RELEASE from a *_PRESS_OUT state
    // never calls onPress. The press rect is the measured region expanded by Pressability's
    // DEFAULT_PRESS_RECT_OFFSETS (top/left/right 20, bottom 30).
    const onPress = vi.fn()
    render(
      <Providers>
        <Image source={{ uri: URI }} width={20} height={20} onPress={onPress} />
      </Providers>,
    )
    const props = lastProps()
    const grant = props['onResponderGrant'] as (event: unknown) => void
    const move = props['onResponderMove'] as (event: unknown) => void
    const release = props['onResponderRelease'] as (event: unknown) => void
    const measurable = {
      measure: (callback: (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => void): void =>
        callback(0, 0, 100, 100, 0, 0),
    }

    // Drag off the image, then release: no press.
    grant({ nativeEvent: {}, currentTarget: measurable })
    move({ nativeEvent: { pageX: 500, pageY: 500 } })
    release({ nativeEvent: {} })
    expect(onPress, 'release outside the press rect').not.toHaveBeenCalled()

    // Within the retention offsets still counts as inside (left offset is 20).
    grant({ nativeEvent: {}, currentTarget: measurable })
    move({ nativeEvent: { pageX: -10, pageY: 50 } })
    release({ nativeEvent: {} })
    expect(onPress, 'release inside the retention rect').toHaveBeenCalledTimes(1)
  })

  it('resolves token-valued dimensions on native, as the legacy driver did', () => {
    // WalletAlertBadge passes width="$spacing48": the legacy NATIVE pipeline resolved it
    // through the size token category (config aliases size to the space map) to 48, while
    // the WEB pipeline dropped it — the parity suite pins the web drop.
    render(
      <Providers>
        <Image source={{ uri: URI }} width="$spacing48" height="$spacing48" />
      </Providers>,
    )
    const style = flatStyle(lastProps())
    expect(style['width']).toBe(48)
    expect(style['height']).toBe(48)
  })

  it('attaches no press wiring when onPress is absent or null', () => {
    render(
      <Providers>
        <Image source={{ uri: URI }} onPress={null} />
      </Providers>,
    )
    const props = lastProps()
    expect(props['onStartShouldSetResponder']).toBeUndefined()
    expect(props['onResponderRelease']).toBeUndefined()
    expect(props['onClick']).toBeUndefined()
  })

  it("passes the styled() wrapper's native pressability delivery through to the host", () => {
    // On native, Tamagui styled(Image) delivers its own usePressability responder handlers
    // as plain props (never `onPress`) — dropping them kills ModalTemplate's
    // onBackgroundPress on mobile. Pin the pass-through.
    const onStartShouldSetResponder = vi.fn(() => true)
    const onResponderRelease = vi.fn()
    const delivered = { onStartShouldSetResponder, onResponderRelease } as Record<string, unknown>
    render(
      <Providers>
        <Image source={{ uri: URI }} {...delivered} />
      </Providers>,
    )
    const props = lastProps()
    expect(props['onStartShouldSetResponder']).toBe(onStartShouldSetResponder)
    expect(props['onResponderRelease']).toBe(onResponderRelease)
  })

  it('objectFit alone expands to resizeMode through the legacy native table', () => {
    render(
      <Providers>
        <Image source={{ uri: URI }} objectFit="contain" />
      </Providers>,
    )
    expect(lastProps()['resizeMode']).toBe('contain')
  })

  it('explicit resizeMode outranks objectFit on native, as RN resolved the legacy pair', () => {
    render(
      <Providers>
        <Image source={{ uri: URI }} objectFit="contain" resizeMode="cover" />
      </Providers>,
    )
    expect(lastProps()['resizeMode']).toBe('cover')
  })

  it('drops web-only CSS (cursor/transition) and inert objectFit from native styles', () => {
    render(
      <Providers>
        <Image source={{ uri: URI }} width={20} cursor="pointer" transition="opacity 0.3s ease" objectFit="cover" />
      </Providers>,
    )
    const style = flatStyle(lastProps())
    expect(style['cursor']).toBeUndefined()
    expect(style['transition']).toBeUndefined()
    expect(style['objectFit']).toBeUndefined()
    expect(style['width']).toBe(20)
  })

  it('unwraps a { uri: <number> } require descriptor on native, backfilling its dimensions (UnitagBanner)', () => {
    // UnitagBanner passes `{ uri: UNITAGS_BANNER_* }` where the constant is a Metro
    // require() asset id (a number). Android reads uri as a string, so passing the
    // descriptor through crashes the bridge (UnexpectedNativeTypeException); legacy
    // Image.native.js:31-37 unwrapped it and backfilled width/height from the descriptor.
    const descriptor = { uri: 42, width: 200, height: 100 } as unknown as NonNullable<ImageProps['source']>
    render(
      <Providers>
        <Image source={descriptor} resizeMode="cover" />
      </Providers>,
    )
    const props = lastProps()
    expect(props['source'], 'raw asset id reaches the host').toBe(42)
    const style = flatStyle(props)
    expect(style['width'], 'descriptor width backfills').toBe(200)
    expect(style['height'], 'descriptor height backfills').toBe(100)

    // An explicit dimension prop outranks the descriptor backfill, as `style.width ??=` did.
    render(
      <Providers>
        <Image source={descriptor} width={300} />
      </Providers>,
    )
    expect(flatStyle(lastProps())['width'], 'explicit width wins').toBe(300)
  })

  it('unwraps the numeric-uri descriptor even inside an ES-module default wrapper', () => {
    // Ordering guard: the `default` unwrap runs before the numeric-uri unwrap, so the
    // theoretical `{ default: { uri: <number> } }` composition cannot smuggle a numeric
    // uri past the bridge.
    const wrapped = { default: { uri: 43, width: 50, height: 60 } } as unknown as NonNullable<ImageProps['source']>
    render(
      <Providers>
        <Image source={wrapped} />
      </Providers>,
    )
    const props = lastProps()
    expect(props['source']).toBe(43)
    const style = flatStyle(props)
    expect(style['width']).toBe(50)
    expect(style['height']).toBe(60)
  })

  it('passes a bare numeric require() source through untouched, as legacy and RN both accept', () => {
    // Legacy only unwrapped the numeric-URI DESCRIPTOR shape; a plain `source={require(...)}`
    // is RN's native contract and flowed through @tamagui/image unchanged (FooterSettings).
    const assetId = 7 as unknown as NonNullable<ImageProps['source']>
    render(
      <Providers>
        <Image source={assetId} />
      </Providers>,
    )
    expect(lastProps()['source']).toBe(7)
  })

  it('does not embed src-derived source dimensions on native (web-only legacy behavior)', () => {
    render(
      <Providers>
        <Image src={URI} width={40} height={40} />
      </Providers>,
    )
    expect(lastProps()['source']).toEqual({ uri: URI })
  })
})
