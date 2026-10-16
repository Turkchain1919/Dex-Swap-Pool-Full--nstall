/**
 * Behavior contract for the `AvatarCompat` web leg (INFRA-3591), asserted on
 * the rendered DOM so `cn()`'s merge result is what gets checked. The load
 * lifecycle is driven through the real `<img>` element's load/error events —
 * the same events the legacy Tamagui `Avatar` (a Radix fork) keys its
 * show-fallback-until-loaded behavior on.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { resetBoundedReportBudgets } from '../compat/diagnostics'
import { AvatarCompat } from './AvatarCompat'

// One UNCONDITIONAL teardown for the console.error spies the colour-lane tests
// install. Each of those tests used to create its own spy and call
// `error.mockRestore()` as its last statement, which is skipped the moment an
// assertion above it throws — leaving `console.error` mocked for every later test
// in the file, so a genuine React or compat error after the first failure was
// swallowed and the run reported one broken test instead of the real cascade.
// The spy's active window is unchanged (only tests that call `spyOnConsoleError`
// get one); only the restore moved somewhere a failure cannot skip it.
let consoleErrorSpy: MockInstance | undefined

function spyOnConsoleError(): MockInstance {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  return consoleErrorSpy
}

afterEach(() => {
  consoleErrorSpy?.mockRestore()
  consoleErrorSpy = undefined
})

afterEach(cleanup)

// The warn dedupe is module-global, so the warn assertions below need a clean
// slate or they would pass or fail on test order (review finding).
beforeEach(() => {
  resetBoundedReportBudgets()
})

const SRC = 'https://example.test/flag.svg'

function renderBlockedCallSiteShape(): ReturnType<typeof render> {
  // The exact compound shape of the one held consumer
  // (apps/web/src/pages/Swap/Buy/CountryListRow.tsx:36-39).
  return render(
    <AvatarCompat circular size={32} testID="avatar">
      <AvatarCompat.Image accessibilityLabel="Country flag" src={SRC} alt="AR" testID="image" />
      <AvatarCompat.Fallback backgroundColor="$neutral3" testID="fallback" />
    </AvatarCompat>,
  )
}

function img(): HTMLImageElement {
  return screen.getByTestId('image') as HTMLImageElement
}

/**
 * Simulates an image that COMPLETED before React attached onLoad (jsdom never
 * loads resources, and its HTMLImageElement has no decode()): stubs the
 * prototype's complete/naturalWidth getters and, when given, installs a
 * decode(). Returns the restore function.
 */
function stubSettledImage({
  naturalWidth,
  decode,
}: {
  naturalWidth: number
  decode?: () => Promise<void>
}): () => void {
  const completeSpy = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
  const widthSpy = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(naturalWidth)
  const hadDecode = 'decode' in HTMLImageElement.prototype
  if (decode !== undefined) {
    Object.defineProperty(HTMLImageElement.prototype, 'decode', { value: decode, configurable: true })
  }
  return () => {
    completeSpy.mockRestore()
    widthSpy.mockRestore()
    if (decode !== undefined && !hadDecode) {
      // SAFETY: removing the test-installed stub; the property is configurable.
      delete (HTMLImageElement.prototype as { decode?: unknown }).decode
    }
  }
}

describe('root frame', () => {
  it('sizes the frame from a raw number (the iconSizes.icon32 call-site shape)', () => {
    renderBlockedCallSiteShape()
    const root = screen.getByTestId('avatar')
    expect(root.style.width).toBe('32px')
    expect(root.style.height).toBe('32px')
  })

  it('sizes the frame from a space token and defaults to $true (8px) like legacy', () => {
    const { rerender } = render(<AvatarCompat size="$spacing48" testID="avatar" />)
    expect(screen.getByTestId('avatar').style.width).toBe('48px')
    rerender(<AvatarCompat testID="avatar" />)
    expect(screen.getByTestId('avatar').style.width).toBe('8px')
    expect(screen.getByTestId('avatar').style.height).toBe('8px')
  })

  it('is circular only when asked (the Tamagui shape variant)', () => {
    const { rerender } = render(<AvatarCompat circular testID="avatar" />)
    expect(screen.getByTestId('avatar').className).toContain('rounded-full')
    rerender(<AvatarCompat testID="avatar" />)
    expect(screen.getByTestId('avatar').className).not.toContain('rounded-full')
  })

  it('clips and centers like the legacy Square frame', () => {
    renderBlockedCallSiteShape()
    const root = screen.getByTestId('avatar')
    expect(root.className).toContain('overflow-hidden')
    expect(root.className).toContain('items-center')
    expect(root.className).toContain('justify-center')
  })

  it('throws on an unknown $ size token instead of emitting a dead style', () => {
    // The shared compat unmappable-token convention (sizeValue).
    expect(() => render(<AvatarCompat size={'$nope' as never} />)).toThrow(/unknown avatar size token/)
  })
})

describe('image', () => {
  it('renders a real img with src, alt and the a11y label mapped to aria-label', () => {
    renderBlockedCallSiteShape()
    expect(img().tagName).toBe('IMG')
    expect(img().getAttribute('src')).toBe(SRC)
    expect(img().getAttribute('alt')).toBe('AR')
    expect(img().getAttribute('aria-label')).toBe('Country flag')
  })

  it('stays mounted through every loading state, like the legacy always-mounted Image', () => {
    renderBlockedCallSiteShape()
    fireEvent.error(img())
    expect(screen.queryByTestId('image')).not.toBeNull()
    fireEvent.load(img())
    expect(screen.queryByTestId('image')).not.toBeNull()
  })

  it('hides the img until loaded and on error — no browser broken-image glyph over the fallback', () => {
    renderBlockedCallSiteShape()
    // While loading: mounted but fully transparent, like the RN-web div whose
    // background paints only once loaded.
    expect(img().className).toContain('opacity-0')
    fireEvent.error(img())
    expect(img().className).toContain('opacity-0')
    fireEvent.load(img())
    expect(img().className).not.toContain('opacity-0')
  })

  it('keeps the accessible name exposed pre-load: hides via opacity, never visibility', () => {
    renderBlockedCallSiteShape()
    // visibility:hidden would drop the img from the accessibility tree in the
    // idle/error states; legacy's RN-web div keeps its aria-label exposed in
    // every state, so the hidden img must too.
    expect(img().className).not.toContain('invisible')
    expect(screen.getByRole('img', { name: 'Country flag' })).toBe(img())
    fireEvent.error(img())
    expect(screen.getByRole('img', { name: 'Country flag' })).toBe(img())
  })

  it('merges className onto the inner img — the same logical element the native leg targets', () => {
    render(
      <AvatarCompat size={32}>
        <AvatarCompat.Image src={SRC} testID="image" className="custom-image-class" />
      </AvatarCompat>,
    )
    expect(img().className).toContain('custom-image-class')
  })

  it('settles to loaded for an already-complete image (cached/data-URI) with no load event', () => {
    // jsdom never loads resources, so `complete` is stubbed to simulate an
    // image that finished before React attached onLoad.
    const restore = stubSettledImage({ naturalWidth: 64 })
    try {
      renderBlockedCallSiteShape()
      expect(screen.queryByTestId('fallback')).toBeNull()
      expect(img().className).not.toContain('opacity-0')
    } finally {
      restore()
    }
  })

  it('settles to loaded for a complete viewBox-only SVG (naturalWidth 0, decode resolves) — the Firefox flag-URL shape', async () => {
    const restore = stubSettledImage({ naturalWidth: 0, decode: () => Promise.resolve() })
    try {
      renderBlockedCallSiteShape()
      await waitFor(() => expect(screen.queryByTestId('fallback')).toBeNull())
      expect(img().className).not.toContain('opacity-0')
    } finally {
      restore()
    }
  })

  it('settles to error for a complete image whose decode rejects (genuinely broken) — the fallback stays', async () => {
    const restore = stubSettledImage({ naturalWidth: 0, decode: () => Promise.reject(new Error('EncodingError')) })
    try {
      const onLoadingStatusChange = vi.fn()
      render(
        <AvatarCompat size={32}>
          <AvatarCompat.Image src={SRC} testID="image-broken" onLoadingStatusChange={onLoadingStatusChange} />
          <AvatarCompat.Fallback testID="fallback-broken" />
        </AvatarCompat>,
      )
      await waitFor(() => expect(onLoadingStatusChange).toHaveBeenLastCalledWith('error'))
      expect(screen.queryByTestId('fallback-broken')).not.toBeNull()
    } finally {
      restore()
    }
  })

  it('without decode(), a complete zero-size image settles loaded — legacy never gates on intrinsic size', () => {
    const restore = stubSettledImage({ naturalWidth: 0 })
    try {
      renderBlockedCallSiteShape()
      expect(screen.queryByTestId('fallback')).toBeNull()
      expect(img().className).not.toContain('opacity-0')
    } finally {
      restore()
    }
  })

  it('does not re-fire onLoadingStatusChange when only the callback identity changes (legacy deps are [status])', () => {
    const calls: string[] = []
    const { rerender } = render(
      <AvatarCompat size={32}>
        <AvatarCompat.Image src={SRC} testID="image" onLoadingStatusChange={(status) => calls.push(status)} />
      </AvatarCompat>,
    )
    expect(calls).toEqual(['idle'])
    rerender(
      <AvatarCompat size={32}>
        <AvatarCompat.Image
          src={SRC}
          testID="image"
          onLoadingStatusChange={(status) => calls.push(`second:${status}`)}
        />
      </AvatarCompat>,
    )
    // Fresh identity, same status: no re-fire.
    expect(calls).toEqual(['idle'])
    // A real transition fires the LATEST callback.
    fireEvent.load(img())
    expect(calls).toEqual(['idle', 'second:loaded'])
  })

  it('mirrors each status transition into onLoadingStatusChange, like legacy', () => {
    const onLoadingStatusChange = vi.fn()
    render(
      <AvatarCompat size={32}>
        <AvatarCompat.Image src={SRC} testID="image" onLoadingStatusChange={onLoadingStatusChange} />
      </AvatarCompat>,
    )
    expect(onLoadingStatusChange).toHaveBeenLastCalledWith('idle')
    fireEvent.load(img())
    expect(onLoadingStatusChange).toHaveBeenLastCalledWith('loaded')
  })
})

describe('fallback (the show-fallback-until-loaded contract)', () => {
  it('renders while the image has not loaded, with the token background class', () => {
    renderBlockedCallSiteShape()
    const fallback = screen.getByTestId('fallback')
    expect(fallback.className).toContain('bg-neutral3')
    expect(fallback.className).toContain('absolute')
  })

  it('unmounts once the image loads', () => {
    renderBlockedCallSiteShape()
    fireEvent.load(img())
    expect(screen.queryByTestId('fallback')).toBeNull()
  })

  it('stays rendered on image load error', () => {
    renderBlockedCallSiteShape()
    fireEvent.error(img())
    expect(screen.queryByTestId('fallback')).not.toBeNull()
  })

  it('returns after a loaded image swaps to a new src (status resets to idle)', () => {
    const { rerender } = render(
      <AvatarCompat size={32}>
        <AvatarCompat.Image src={SRC} testID="image" />
        <AvatarCompat.Fallback testID="fallback" />
      </AvatarCompat>,
    )
    fireEvent.load(img())
    expect(screen.queryByTestId('fallback')).toBeNull()
    rerender(
      <AvatarCompat size={32}>
        <AvatarCompat.Image src="https://example.test/other.svg" testID="image" />
        <AvatarCompat.Fallback testID="fallback" />
      </AvatarCompat>,
    )
    expect(screen.queryByTestId('fallback')).not.toBeNull()
  })

  it('honors delayMs before first render, like legacy', () => {
    vi.useFakeTimers()
    try {
      render(
        <AvatarCompat size={32}>
          <AvatarCompat.Fallback delayMs={300} testID="fallback" />
        </AvatarCompat>,
      )
      expect(screen.queryByTestId('fallback')).toBeNull()
      act(() => {
        vi.advanceTimersByTime(300)
      })
    } finally {
      vi.useRealTimers()
    }
    expect(screen.getByTestId('fallback')).not.toBeNull()
  })

  // Was a throw pin. The shared colour lane now warns and continues, so an
  // avatar fallback with an unresolvable token renders unpainted instead of
  // taking the whole tree down.
  it('warns and emits no background class on an unknown $ token, without throwing', () => {
    const error = spyOnConsoleError()
    render(
      <AvatarCompat size={32}>
        <AvatarCompat.Fallback backgroundColor={'$doesNotExist' as never} testID="fallback" />
      </AvatarCompat>,
    )
    const fallback = screen.getByTestId('fallback')
    expect(fallback).not.toBeNull()
    expect(fallback.className).not.toMatch(/\bbg-/)
    expect(error.mock.calls.map((call) => String(call[0])).join('\n')).toContain(
      '"$doesNotExist" for "backgroundColor"',
    )
  })

  // The palette fallback reaches the class list here, but this lane hand-builds
  // its classes (`avatarFallbackClassName`) instead of rendering through
  // `composeCompatEmission`, so it gets no `--c-bg` var twin and the arbitrary
  // class has no safelist entry. That limitation is pre-existing and NOT specific
  // to the fallback: a raw hex behaves identically, as the second half pins. So on
  // an avatar the palette token degrades to "no paint" rather than to its literal,
  // which is still strictly better than the crash this replaced.
  it('warns and emits the palette literal, which this lane cannot paint (same as a raw hex)', () => {
    const error = spyOnConsoleError()
    const { unmount } = render(
      <AvatarCompat size={32}>
        <AvatarCompat.Fallback backgroundColor={'$greenBase' as never} testID="fallback" />
      </AvatarCompat>,
    )
    const tokenClass = screen.getByTestId('fallback').className
    expect(tokenClass).toContain('bg-[#0C8911]')
    expect(tokenClass).not.toContain('--c-bg')
    expect(error.mock.calls.map((call) => String(call[0])).join('\n')).toContain('"$greenBase" for "backgroundColor"')
    unmount()

    // The pre-existing half: an explicit hex takes the same unsafelisted shape.
    render(
      <AvatarCompat size={32}>
        <AvatarCompat.Fallback backgroundColor="#0C8911" testID="fallback" />
      </AvatarCompat>,
    )
    expect(screen.getByTestId('fallback').className).toContain('bg-[#0C8911]')
  })
})

describe('compound shape', () => {
  it('exposes Image and Fallback as static members, like the legacy withStaticProperties compound', () => {
    expect(AvatarCompat.Image).toBeDefined()
    expect(AvatarCompat.Fallback).toBeDefined()
  })
})
