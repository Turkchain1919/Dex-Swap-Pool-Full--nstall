/**
 * Web `onLayout` lane (compat/dom.tsx `useOnLayout`): the observer must attach
 * not only when the node mounts with a handler, but also when a handler arrives
 * AFTER mount — consumers gate it conditionally (`onLayout={enabled ? fn : undefined}`,
 * e.g. AmountInput's hidden measurement Text), and the legacy Tamagui engine
 * re-ran its layout effect on `[ref, !!onLayout]`, so a late handler started
 * observation. A component that mounts with no handler and gains one later must
 * still receive layout notifications.
 */
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TextCompat } from '../text-compat/TextCompat.web'

type ResizeCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void

/** jsdom has no ResizeObserver: the mock records instances so tests drive notifications by hand. */
class MockResizeObserver {
  static instances: MockResizeObserver[] = []
  readonly observed: Element[] = []
  readonly disconnect = vi.fn()
  private readonly callback: ResizeCallback

  constructor(callback: ResizeCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.observed.push(target)
    // Real ResizeObserver delivers an initial notification for every observed element.
    this.callback([], this as unknown as ResizeObserver)
  }

  unobserve(): void {}

  fire(): void {
    this.callback([], this as unknown as ResizeObserver)
  }
}

const originalResizeObserver = globalThis.ResizeObserver

beforeEach(() => {
  MockResizeObserver.instances = []
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
})

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver
})

describe('useOnLayout handler arriving after mount', () => {
  it('attaches the observer and notifies when onLayout flips from undefined to a handler', () => {
    const onLayout = vi.fn()
    const { rerender } = render(<TextCompat>measure me</TextCompat>)
    expect(MockResizeObserver.instances).toHaveLength(0)

    rerender(<TextCompat onLayout={onLayout}>measure me</TextCompat>)
    expect(MockResizeObserver.instances).toHaveLength(1)
    expect(onLayout).toHaveBeenCalledWith({
      nativeEvent: { layout: { x: 0, y: 0, width: expect.any(Number), height: expect.any(Number) } },
    })
  })

  it('disconnects when the handler flips back to undefined', () => {
    const onLayout = vi.fn()
    const { rerender } = render(<TextCompat onLayout={onLayout}>measure me</TextCompat>)
    const observer = MockResizeObserver.instances.at(-1)
    expect(observer).toBeDefined()

    rerender(<TextCompat>measure me</TextCompat>)
    expect(observer?.disconnect).toHaveBeenCalled()

    // A resize after detach must not call the stale handler.
    onLayout.mockClear()
    act(() => observer?.fire())
    expect(onLayout).not.toHaveBeenCalled()
  })

  it('still notifies on mount when the handler is present from the start', () => {
    const onLayout = vi.fn()
    render(<TextCompat onLayout={onLayout}>measure me</TextCompat>)
    expect(MockResizeObserver.instances).toHaveLength(1)
    expect(onLayout).toHaveBeenCalledTimes(1)
  })
})
