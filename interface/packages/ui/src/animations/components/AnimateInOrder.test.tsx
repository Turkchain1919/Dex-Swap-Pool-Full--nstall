import { act, render, screen } from '@testing-library/react'
import { Text } from '@universe/mycelium'
import { ANIMATE_IN_ORDER_DELAY_MS, AnimateInOrder } from 'ui/src/animations/components/AnimateInOrder'
import { SharedUIUniswapProvider } from 'ui/src/test/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const CHILD_TEXT = 'artwork'

function renderAtIndex(index: number): ReturnType<typeof render> {
  return render(
    <SharedUIUniswapProvider>
      <AnimateInOrder index={index}>
        <Text>{CHILD_TEXT}</Text>
      </AnimateInOrder>
    </SharedUIUniswapProvider>,
  )
}

describe('AnimateInOrder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Regression: children used to be gated behind the stagger timer, so nothing existed in the
  // first commit and the reveal depended entirely on Tamagui's enterStyle handshake (CONS-2903).
  it('renders children on the first commit, before the stagger delay elapses', () => {
    renderAtIndex(12)

    expect(screen.getByText(CHILD_TEXT)).toBeDefined()
  })

  it('reveals the child once its staggered delay elapses', () => {
    renderAtIndex(2)

    // The host is a mycelium Flex, so opacity is an emitted class (`opacity-[n]`) that jsdom
    // cannot resolve through getComputedStyle.
    const host = screen.getByText(CHILD_TEXT).parentElement as HTMLElement
    expect(host.classList.contains('opacity-[1]')).toBe(false)

    act(() => {
      vi.advanceTimersByTime(2 * ANIMATE_IN_ORDER_DELAY_MS)
    })

    expect(host.classList.contains('opacity-[1]')).toBe(true)
  })

  it('clears its pending stagger timer on unmount', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { unmount } = renderAtIndex(3)

    const staggerTimer = setTimeoutSpy.mock.results.at(-1)?.value
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalledWith(staggerTimer)
  })
})
