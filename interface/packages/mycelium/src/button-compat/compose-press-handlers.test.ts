/**
 * Direct unit tests for `composeWebPressHandlers` (INFRA-3511). The
 * throw/rethrow semantics here are exercised at the function level rather
 * than through a full DOM `fireEvent.click` dispatch: `dispatchEvent` per
 * spec does NOT propagate a listener's exception back to its caller (jsdom
 * matches real browsers here — the error is reported async, e.g. via
 * `window.onerror`), so a DOM-level test can't deterministically observe
 * "the exception still propagates" the way a direct call can.
 */
import { describe, expect, it, vi } from 'vitest'
import { composeWebPressHandlers } from './compose-press-handlers'
import type { WebButtonPressEvent } from './press-handler'

const event = {} as WebButtonPressEvent

describe('composeWebPressHandlers', () => {
  it('runs both handlers once, consumer first', () => {
    const order: string[] = []
    const composed = composeWebPressHandlers(
      () => order.push('consumer'),
      () => order.push('injected'),
    )

    composed?.(event)

    expect(order).toEqual(['consumer', 'injected'])
  })

  // Review finding: a throwing consumer handler must not drop the injected
  // handler (the same silent-analytics-loss shape this PR fixes), and the
  // consumer's exception must still propagate — not be swallowed.
  it('still runs the injected handler when the consumer handler throws, then rethrows', () => {
    const injected = vi.fn()
    const boom = new Error('boom')
    const composed = composeWebPressHandlers(() => {
      throw boom
    }, injected)

    expect(() => composed?.(event)).toThrow(boom)
    expect(injected).toHaveBeenCalledTimes(1)
  })

  it('still runs the consumer handler when the injected handler throws (consumer runs first), then rethrows', () => {
    const consumer = vi.fn()
    const composed = composeWebPressHandlers(consumer, () => {
      throw new Error('boom')
    })

    expect(() => composed?.(event)).toThrow('boom')
    expect(consumer).toHaveBeenCalledTimes(1)
  })

  it('passes only the consumer handler through unchanged when there is no injected handler', () => {
    const consumer = vi.fn()
    expect(composeWebPressHandlers(consumer, undefined)).toBe(consumer)
  })

  it('passes only the injected handler through unchanged when there is no consumer handler', () => {
    const injected = vi.fn()
    expect(composeWebPressHandlers(undefined, injected)).toBe(injected)
  })

  it('returns undefined when neither handler is supplied', () => {
    expect(composeWebPressHandlers(undefined, undefined)).toBeUndefined()
  })
})
