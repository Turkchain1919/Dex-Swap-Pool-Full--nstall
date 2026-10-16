import { act, renderHook } from '@testing-library/react'
import { getPageScrollTarget } from '~/components/TokenCardCarousel/carouselSnapScroll'
import { useHorizontalSnapCarousel } from '~/components/TokenCardCarousel/useHorizontalSnapCarousel'

function renderCarousel(isAutoScrolling: boolean): {
  el: HTMLDivElement
  result: ReturnType<typeof renderHook<ReturnType<typeof useHorizontalSnapCarousel>, boolean>>['result']
  rerender: (isAutoScrolling: boolean) => void
} {
  const el = document.createElement('div')
  // The scroll listeners attach once the element is known and loading is over, so start loading,
  // hand over the element, then finish loading.
  const { result, rerender } = renderHook(
    ({ isAutoScrolling: auto, isLoading }: { isAutoScrolling: boolean; isLoading: boolean }) =>
      useHorizontalSnapCarousel({ cardWidth: 200, itemCount: 5, isLoading, isAutoScrolling: auto }),
    { initialProps: { isAutoScrolling, isLoading: true } },
  )
  act(() => result.current.setScrollRef(el))
  rerender({ isAutoScrolling, isLoading: false })
  return { el, result, rerender: (auto) => rerender({ isAutoScrolling: auto, isLoading: false }) }
}

function scroll(el: HTMLDivElement): void {
  act(() => {
    el.dispatchEvent(new Event('scroll'))
  })
}

describe('useHorizontalSnapCarousel', () => {
  it('marks the carousel unsettled on scroll', () => {
    const { el, result } = renderCarousel(false)

    scroll(el)

    expect(result.current.isScrollSettled).toBe(false)
  })

  it('ignores scroll events while auto-scrolling', () => {
    const { el, result } = renderCarousel(true)

    scroll(el)

    expect(result.current.isScrollSettled).toBe(true)
  })

  it('tracks scroll again once auto-scrolling stops', () => {
    const { el, result, rerender } = renderCarousel(true)

    rerender(false)
    scroll(el)

    expect(result.current.isScrollSettled).toBe(false)
  })

  it('marks the carousel settled when auto-scrolling starts', () => {
    const { el, result, rerender } = renderCarousel(false)

    scroll(el)
    expect(result.current.isScrollSettled).toBe(false)

    rerender(true)

    expect(result.current.isScrollSettled).toBe(true)
  })

  it('forgets an in-flight arrow target once auto-scrolling takes over', () => {
    vi.useFakeTimers()
    const { el, result } = renderCarousel(true)
    const positions = Array.from({ length: 11 }, (_, i) => i * 220)
    positions.forEach((offsetLeft) => {
      const card = document.createElement('div')
      Object.defineProperty(card, 'offsetLeft', { value: offsetLeft })
      Object.defineProperty(card, 'offsetWidth', { value: 200 })
      el.appendChild(card)
    })
    Object.defineProperty(el, 'clientWidth', { value: 500 })
    Object.defineProperty(el, 'scrollWidth', { value: 2400 })
    Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true })
    const scrollTo = vi.fn()
    el.scrollTo = scrollTo

    // Hovered arrow click, then the pointer leaves before the smooth scroll lands.
    act(() => result.current.showButton())
    act(() => result.current.onNext())
    const firstTarget = scrollTo.mock.calls[0][0].left
    act(() => result.current.hideButton())
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // The marquee has since moved the strip; the next click must start from where it really is.
    el.scrollLeft = 220
    act(() => result.current.showButton())
    act(() => result.current.onNext())

    const args = { positions, direction: 'next' as const, pageSize: 2, maxScrollLeft: 1900 }
    const fromStaleTarget = getPageScrollTarget({ ...args, scrollLeft: firstTarget })
    const fromLiveScroll = getPageScrollTarget({ ...args, scrollLeft: 220 })
    expect(fromLiveScroll).not.toBe(fromStaleTarget)
    expect(scrollTo.mock.calls[1][0].left).toBe(fromLiveScroll)
    vi.useRealTimers()
  })

  it('tracks scroll while the user hovers an auto-scrolling carousel', () => {
    const { el, result } = renderCarousel(true)

    act(() => result.current.showButton())
    scroll(el)

    expect(result.current.isScrollSettled).toBe(false)
  })
})
