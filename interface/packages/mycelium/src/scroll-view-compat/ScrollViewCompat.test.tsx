/**
 * Behavior contract for the `ScrollView` compat web leg,
 * asserted on the rendered DOM. The legacy reference is the `ui/src` Tamagui
 * `ScrollView` — a styled react-native-web ScrollView — whose web behavior
 * (base styles, scroll-event normalization and throttling, indicator hiding,
 * scroll disabling) is reproduced from the RNW source.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCROLL_VIEW_BASE_HORIZONTAL, SCROLL_VIEW_BASE_VERTICAL, scrollViewCompatClassName } from './compile'
import { __resetScrollViewCompatWarnings } from './diagnostics'
import type { ScrollViewCompatProps, ScrollViewCompatRef, ScrollViewCompatScrollEvent } from './props'
import { ScrollViewCompat } from './ScrollViewCompat'

afterEach(() => {
  cleanup()
})

function frameOf(container: HTMLElement): HTMLElement {
  const frame = container.firstElementChild
  if (!(frame instanceof HTMLElement)) {
    throw new Error('no scroll frame rendered')
  }
  return frame
}

function contentOf(container: HTMLElement): HTMLElement {
  const content = frameOf(container).firstElementChild
  if (!(content instanceof HTMLElement)) {
    throw new Error('no content container rendered')
  }
  return content
}

describe('frame classes (the RNW base model)', () => {
  it('renders the vertical base by default and the horizontal base under `horizontal`', () => {
    const { container } = render(<ScrollViewCompat testID="scroll" />)
    const frame = frameOf(container)
    expect(frame.getAttribute('data-testid')).toBe('scroll')
    expect(frame.className).toBe(scrollViewCompatClassName({}))
    expect(frame.className).toContain('overflow-y-auto')
    expect(frame.className).toContain('overflow-x-hidden')

    const { container: horizontal } = render(<ScrollViewCompat horizontal />)
    const horizontalFrame = frameOf(horizontal)
    expect(horizontalFrame.className).toContain('flex-row')
    expect(horizontalFrame.className).toContain('overflow-x-auto')
    expect(horizontalFrame.className).toContain('overflow-y-hidden')
  })

  it('caller style props override the base (the styled() precedence)', () => {
    const { container } = render(<ScrollViewCompat overflow="visible" backgroundColor="$surface2" />)
    const frame = frameOf(container)
    expect(frame.className).toContain('overflow-visible')
    expect(frame.className).not.toContain('overflow-y-auto')
    expect(frame.className).toContain('bg-surface2')
  })

  it('hides the scrollbar when either indicator prop is false (RNW hideScrollbar)', () => {
    const { container } = render(<ScrollViewCompat horizontal showsHorizontalScrollIndicator={false} />)
    expect(frameOf(container).className).toContain('[scrollbar-width:none]')
  })

  it('freezes both axes when scrollEnabled is false (RNW scrollDisabled, over the caller styles)', () => {
    const { container } = render(<ScrollViewCompat scrollEnabled={false} />)
    const frame = frameOf(container)
    expect(frame.className).toContain('overflow-x-hidden')
    expect(frame.className).toContain('overflow-y-hidden')
    expect(frame.className).toContain('[touch-action:none]')
    expect(frame.className).not.toContain('overflow-y-auto')
  })

  it('compiles the legacy fullscreen variant under the caller props', () => {
    const { container } = render(<ScrollViewCompat fullscreen />)
    const frame = frameOf(container)
    expect(frame.className).toContain('absolute')
    expect(frame.className).toContain('top-[0px]')
    expect(frame.className).toContain('bottom-[0px]')
  })

  it('the direction bases pin the RNW model', () => {
    expect(SCROLL_VIEW_BASE_VERTICAL).toContain('overflow-y-auto')
    expect(SCROLL_VIEW_BASE_HORIZONTAL).toContain('flex-row')
  })
})

describe('content container (the RNW inner View)', () => {
  it('wraps children in a content container, row-directed under `horizontal`', () => {
    const { container } = render(
      <ScrollViewCompat horizontal>
        <span>row content</span>
      </ScrollViewCompat>,
    )
    const content = contentOf(container)
    expect(content.className).toContain('flex-row')
    expect(content.textContent).toBe('row content')
  })

  it('compiles contentContainerStyle through the compat style compiler', () => {
    const { container } = render(
      <ScrollViewCompat contentContainerStyle={{ gap: '$gap8', alignItems: 'center', paddingBottom: 33 }} />,
    )
    const content = contentOf(container)
    expect(content.className).toContain('items-center')
    expect(content.className).toContain('gap-')
  })

  it(
    'does not misclassify contentContainerStyle as a typo’d pseudo pool key ' +
      '(INFRA-3260 regression: an object-valued *Style-suffixed own-prop unrelated to the pseudo pool)',
    () => {
      expect(() =>
        render(<ScrollViewCompat contentContainerStyle={{ gap: '$gap8', flexDirection: 'row' }} />),
      ).not.toThrow()
    },
  )

  it("still rejects a genuinely typo'd pseudo pool key (hoverStyles for hoverStyle)", () => {
    // The typo'd key isn't part of the closed pseudo-pool union, so it can only
    // typecheck through the same widening spread a real caller's mistake would
    // reach the runtime through.
    const props = { hoverStyles: { gap: 8 } } as ScrollViewCompatProps
    expect(() => render(React.createElement(ScrollViewCompat, props))).toThrow(
      /unknown pseudo-state prop "hoverStyles"/,
    )
  })
})

describe('scroll events (the RNW ScrollViewBase synthesis)', () => {
  function scrollableFrame(container: HTMLElement): HTMLElement {
    const frame = frameOf(container)
    Object.defineProperties(frame, {
      scrollLeft: { value: 40, configurable: true },
      scrollTop: { value: 0, configurable: true },
      scrollWidth: { value: 500, configurable: true },
      scrollHeight: { value: 50, configurable: true },
      offsetWidth: { value: 200, configurable: true },
      offsetHeight: { value: 50, configurable: true },
    })
    return frame
  }

  it('normalizes DOM scrolls to the RN event shape', () => {
    const events: ScrollViewCompatScrollEvent[] = []
    const { container } = render(
      <ScrollViewCompat horizontal scrollEventThrottle={16} onScroll={(event) => events.push(event)} />,
    )
    fireEvent.scroll(scrollableFrame(container))
    expect(events).toHaveLength(1)
    expect(events[0]?.nativeEvent).toEqual({
      contentOffset: { x: 40, y: 0 },
      contentSize: { width: 500, height: 50 },
      layoutMeasurement: { width: 200, height: 50 },
    })
  })

  it('emits the trailing scroll-end event after the RNW 100ms debounce', () => {
    vi.useFakeTimers()
    try {
      const onScroll = vi.fn()
      const { container } = render(<ScrollViewCompat scrollEventThrottle={16} onScroll={onScroll} />)
      const frame = scrollableFrame(container)
      fireEvent.scroll(frame)
      expect(onScroll).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(150)
      expect(onScroll).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('throttle 0 emits no mid-scroll ticks beyond the start (RNW shouldEmitScrollEvent)', () => {
    vi.useFakeTimers()
    try {
      const onScroll = vi.fn()
      const { container } = render(<ScrollViewCompat onScroll={onScroll} />)
      const frame = scrollableFrame(container)
      fireEvent.scroll(frame)
      fireEvent.scroll(frame)
      fireEvent.scroll(frame)
      // Start emission only; the two follow-ups are ticks a zero throttle drops.
      expect(onScroll).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('imperative handle (the RN ref surface real call sites use)', () => {
  it('exposes scrollTo / scrollToEnd / getScrollableNode against the DOM node, smooth unless opted out (RNW animated !== false)', () => {
    const ref = React.createRef<ScrollViewCompatRef>()
    const { container } = render(<ScrollViewCompat ref={ref} />)
    const frame = frameOf(container)
    const received: ScrollToOptions[] = []
    Object.defineProperty(frame, 'scrollTo', {
      value: (options: ScrollToOptions) => received.push(options),
      configurable: true,
    })
    Object.defineProperty(frame, 'scrollHeight', { value: 400, configurable: true })

    // The common no-flag call: legacy scrolls smoothly, so must the compat.
    ref.current?.scrollTo({ x: 10, y: 20 })
    expect(received[0]).toMatchObject({ left: 10, top: 20, behavior: 'smooth' })

    ref.current?.scrollTo({ x: 10, y: 20, animated: false })
    expect(received[1]).toMatchObject({ left: 10, top: 20, behavior: 'auto' })

    ref.current?.scrollTo(30, 5)
    expect(received[2]).toMatchObject({ left: 5, top: 30, behavior: 'smooth' })

    ref.current?.scrollToEnd()
    expect(received[3]).toMatchObject({ top: 400, behavior: 'smooth' })

    ref.current?.scrollToEnd({ animated: false })
    expect(received[4]).toMatchObject({ top: 400, behavior: 'auto' })

    expect(ref.current?.getScrollableNode()).toBe(frame)
  })
})

describe('stickyHeaderIndices (accepted-and-ignored on web)', () => {
  beforeEach(() => {
    __resetScrollViewCompatWarnings()
  })

  it('dev-warns once so a web-reachable conversion cannot lose sticky headers silently', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(<ScrollViewCompat stickyHeaderIndices={[0]} />)
    render(<ScrollViewCompat stickyHeaderIndices={[1]} />)
    const stickyWarnings = warn.mock.calls.filter((call) => String(call[0]).includes('stickyHeaderIndices'))
    expect(stickyWarnings).toHaveLength(1)
    warn.mockRestore()
  })
})

describe('shared compat surfaces still ride the frame', () => {
  it('forwards aria/testID and the user style attribute', () => {
    const { container } = render(<ScrollViewCompat aria-label="token rows" testID="rows" style={{ marginTop: 3 }} />)
    const frame = frameOf(container)
    expect(frame.getAttribute('aria-label')).toBe('token rows')
    expect(frame.getAttribute('data-testid')).toBe('rows')
    expect(frame.style.marginTop).toBe('3px')
  })

  it('keeps RN-only props out of the DOM (the mirror of the native allow-list)', () => {
    const { container } = render(
      <ScrollViewCompat
        bounces={false}
        contentInset={{ top: 10 }}
        refreshControl={(<span data-probe="refresh" />) as never}
        scrollPerfTag="probe"
      />,
    )
    const frame = frameOf(container)
    const attributeNames = frame.getAttributeNames().map((name) => name.toLowerCase())
    for (const leaked of ['bounces', 'contentinset', 'refreshcontrol', 'scrollperftag']) {
      expect(attributeNames).not.toContain(leaked)
    }
    // The refreshControl ELEMENT must not render either — RNW mounts it, this
    // web leg deliberately does not (drag-to-refresh is a native interaction).
    expect(container.querySelector('[data-probe="refresh"]')).toBeNull()
  })
})
