/**
 * INFRA-3511 parity pins: an analytics-wrapped ButtonCompat must fire BOTH the
 * consumer's `onPress` and the wrapper-injected `onClick` on one click.
 *
 * On web, `Trace` (utilities/src/telemetry/trace/Trace.tsx) logs a press by
 * `React.cloneElement`-ing its child with an `onClick` that (a) calls the
 * child's ORIGINAL `onClick` prop, then (b) sends the analytics event —
 * unconditionally, with no `defaultPrevented` check (trace/utils.ts
 * getEventHandlers). The wrapper below reproduces that injection shape without
 * importing the real Trace (which drags in navigation + analytics runtime).
 *
 * Legacy Button survived this because Tamagui composes `onClick` and `onPress`
 * into one DOM click handler that always calls both (@tamagui/web
 * createComponent: `onClick?.(e), onPress?.(e)` — onClick first). The compat's
 * compose runs the CONSUMER handler first instead (the ruling's order);
 * the divergence is pinned by the ordering test below.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Children, cloneElement, isValidElement, type JSX, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ButtonCompat } from './ButtonCompat'
import type { WebButtonPressEvent } from './press-handler'

/**
 * Minimal Trace stand-in: clone-injects `onClick`, calling the child's
 * original `onClick` first and then the analytics send — the exact
 * getEventHandlers shape (trace/utils.ts).
 */
function TraceStyleWrapper({ children, onAnalytics }: PropsWithChildren<{ onAnalytics: () => void }>): JSX.Element {
  return (
    <>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) {
          return child
        }
        const originalOnClick = (child.props as { onClick?: (e: unknown) => void }).onClick
        return cloneElement(child as JSX.Element, {
          onClick: (e: unknown): void => {
            originalOnClick?.(e)
            onAnalytics()
          },
        })
      })}
    </>
  )
}

afterEach(cleanup)

describe('ButtonCompat — Trace-injected onClick composes with onPress (INFRA-3511)', () => {
  it('one click fires BOTH the consumer onPress and the injected onClick', () => {
    const onPress = vi.fn()
    const onAnalytics = vi.fn()
    render(
      <TraceStyleWrapper onAnalytics={onAnalytics}>
        <ButtonCompat onPress={onPress}>Swap</ButtonCompat>
      </TraceStyleWrapper>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onAnalytics).toHaveBeenCalledTimes(1)
  })

  it('runs the consumer onPress BEFORE the injected onClick (the INFRA-3511 ruling; legacy Tamagui ran onClick first)', () => {
    const order: string[] = []
    render(
      <TraceStyleWrapper onAnalytics={() => order.push('analytics')}>
        <ButtonCompat onPress={() => order.push('onPress')}>Swap</ButtonCompat>
      </TraceStyleWrapper>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(order).toEqual(['onPress', 'analytics'])
  })

  it('passes the SAME event object to both handlers', () => {
    const seen: unknown[] = []
    const onPress = (e: WebButtonPressEvent): void => {
      seen.push(e)
    }
    render(
      <TraceStyleWrapper onAnalytics={() => undefined}>
        <ButtonCompat
          onPress={onPress}
          onClick={(e) => {
            seen.push(e)
          }}
        >
          Swap
        </ButtonCompat>
      </TraceStyleWrapper>,
    )

    fireEvent.click(screen.getByRole('button'))

    // onPress, consumer onClick (via the wrapper's original-handler call) — one dispatch
    expect(seen).toHaveLength(2)
    expect(seen[0]).toBe(seen[1])
  })

  // Legacy pin: Tamagui's composed click handler calls both back to back with
  // no `defaultPrevented` gate, and Trace's analytics send is unconditional.
  it('preventDefault() in the consumer onPress does not suppress the injected onClick', () => {
    const onAnalytics = vi.fn()
    render(
      <TraceStyleWrapper onAnalytics={onAnalytics}>
        {/* explicit web annotation — the bivariant escape INFRA-3261 keeps open */}
        <ButtonCompat onPress={(e: WebButtonPressEvent) => e.preventDefault()}>Swap</ButtonCompat>
      </TraceStyleWrapper>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(onAnalytics).toHaveBeenCalledTimes(1)
  })

  it('stopPropagation() in the consumer onPress does not suppress the injected onClick (same listener, not propagation)', () => {
    const onAnalytics = vi.fn()
    render(
      <TraceStyleWrapper onAnalytics={onAnalytics}>
        <ButtonCompat onPress={(e: WebButtonPressEvent) => e.stopPropagation()}>Swap</ButtonCompat>
      </TraceStyleWrapper>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(onAnalytics).toHaveBeenCalledTimes(1)
  })

  it('a consumer onClick (no onPress) still fires alongside the injection, once each', () => {
    const onClick = vi.fn()
    const onAnalytics = vi.fn()
    render(
      <TraceStyleWrapper onAnalytics={onAnalytics}>
        <ButtonCompat onClick={onClick}>Swap</ButtonCompat>
      </TraceStyleWrapper>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onAnalytics).toHaveBeenCalledTimes(1)
  })

  // Legacy attaches events on a disabled-but-interactive frame (`disabled` is
  // false when onDisabledPress exists), so analytics fires there too.
  it('disabled + onDisabledPress: one click fires both onDisabledPress and the injected onClick, onDisabledPress first', () => {
    const order: string[] = []
    render(
      <TraceStyleWrapper onAnalytics={() => order.push('analytics')}>
        <ButtonCompat disabled onDisabledPress={() => order.push('onDisabledPress')}>
          Swap
        </ButtonCompat>
      </TraceStyleWrapper>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(order).toEqual(['onDisabledPress', 'analytics'])
  })

  // Legacy attaches NO events on a fully disabled frame — analytics stays
  // silent even under a programmatic dispatch that bypasses the disabled attr.
  it('fully disabled (no onDisabledPress): neither handler fires', () => {
    const onPress = vi.fn()
    const onAnalytics = vi.fn()
    render(
      <TraceStyleWrapper onAnalytics={onAnalytics}>
        <ButtonCompat disabled onPress={onPress}>
          Swap
        </ButtonCompat>
      </TraceStyleWrapper>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(onPress).not.toHaveBeenCalled()
    expect(onAnalytics).not.toHaveBeenCalled()
  })

  it('unwrapped: onPress alone still fires (no regression without an injection)', () => {
    const onPress = vi.fn()
    render(<ButtonCompat onPress={onPress}>Swap</ButtonCompat>)

    fireEvent.click(screen.getByRole('button'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
