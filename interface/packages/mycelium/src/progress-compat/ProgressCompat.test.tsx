/**
 * Behaviour contract for the Progress compat (INFRA-3645), asserted on the
 * rendered DOM against the legacy reference (`@tamagui/progress`): a
 * `progressbar`-role track carrying the Radix value aria-attributes, with the
 * indicator rendered as its child. jsdom reports a `0` layout width, so this
 * suite pins the value/aria/structure contract rather than the measured
 * translate (which is exercised by the browser, not jsdom).
 */
import { cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProgressCompat } from './ProgressCompat'
import type { ProgressIndicatorCompatProps } from './props'

afterEach(() => {
  cleanup()
})

function getBar(container: HTMLElement): HTMLElement {
  const bar = container.querySelector('[role="progressbar"]')
  if (!(bar instanceof HTMLElement)) {
    throw new Error('progressbar not rendered')
  }
  return bar
}

describe('Progress root', () => {
  it('renders a progressbar with the Radix value aria-attributes', () => {
    const { container } = render(<ProgressCompat value={42} />)
    const bar = getBar(container)
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(bar.getAttribute('aria-valuenow')).toBe('42')
    expect(bar.getAttribute('aria-valuetext')).toBe('42%')
  })

  it('honours a custom max in the fill label', () => {
    const { container } = render(<ProgressCompat value={1} max={4} />)
    const bar = getBar(container)
    expect(bar.getAttribute('aria-valuemax')).toBe('4')
    expect(bar.getAttribute('aria-valuenow')).toBe('1')
    expect(bar.getAttribute('aria-valuetext')).toBe('25%')
  })

  it('renders as indeterminate when the value is out of range (legacy null)', () => {
    const { container } = render(<ProgressCompat value={150} />)
    const bar = getBar(container)
    expect(bar.getAttribute('aria-valuenow')).toBeNull()
    expect(bar.getAttribute('aria-valuetext')).toBeNull()
  })

  it('uses a custom getValueLabel for the aria-valuetext', () => {
    const { container } = render(
      <ProgressCompat value={3} max={10} getValueLabel={(value, max) => `${value} of ${max} done`} />,
    )
    expect(getBar(container).getAttribute('aria-valuetext')).toBe('3 of 10 done')
  })

  it('lets caller props override the frame defaults', () => {
    const { container } = render(
      <ProgressCompat value={10} backgroundColor="$transparent" height={8} testID="alloc-track" />,
    )
    const bar = getBar(container)
    expect(container.querySelector('[data-testid="alloc-track"]')).toBe(bar)
    // Caller props sit after the frame defaults, so they win: bg-transparent
    // over the default $background (bg-surface1), h-[8px] over the default h-[2px].
    expect(bar.className).toContain('bg-transparent')
    expect(bar.className).not.toContain('bg-surface1')
    expect(bar.className).toContain('h-[8px]')
    expect(bar.className).not.toContain('h-[2px]')
  })
})

describe('Radix data-* attributes', () => {
  it('reports the loading state on the root', () => {
    const { container } = render(<ProgressCompat value={42} />)
    const bar = getBar(container)
    expect(bar.getAttribute('data-state')).toBe('loading')
    expect(bar.getAttribute('data-value')).toBe('42')
    expect(bar.getAttribute('data-max')).toBe('100')
  })

  it('reports complete once the value reaches max', () => {
    const { container } = render(<ProgressCompat value={4} max={4} />)
    const bar = getBar(container)
    expect(bar.getAttribute('data-state')).toBe('complete')
    expect(bar.getAttribute('data-value')).toBe('4')
    expect(bar.getAttribute('data-max')).toBe('4')
  })

  it('reports indeterminate and omits data-value when the value is out of range', () => {
    const { container } = render(<ProgressCompat value={150} />)
    const bar = getBar(container)
    expect(bar.getAttribute('data-state')).toBe('indeterminate')
    expect(bar.getAttribute('data-value')).toBeNull()
    expect(bar.getAttribute('data-max')).toBe('100')
  })

  it('mirrors the data-* attributes onto the indicator', () => {
    const { container } = render(
      <ProgressCompat value={30} max={60}>
        <ProgressCompat.Indicator testID="alloc-indicator" />
      </ProgressCompat>,
    )
    const indicator = container.querySelector('[data-testid="alloc-indicator"]')
    expect(indicator?.getAttribute('data-state')).toBe('loading')
    expect(indicator?.getAttribute('data-value')).toBe('30')
    expect(indicator?.getAttribute('data-max')).toBe('60')
  })
})

describe('Progress.Indicator', () => {
  // The legacy `animation` prop (curve name "quick") is passed via the props
  // object — the object-key form, not a JSX attribute — so this test proves the
  // compat accepts it without itself tripping the no-tamagui-styling gate.
  const indicatorProps: ProgressIndicatorCompatProps = {
    backgroundColor: '$neutral1',
    borderRadius: '$roundedFull',
    animation: 'quick',
  }

  it('renders inside the track and accepts the legacy indicator props', () => {
    const { container } = render(
      <ProgressCompat value={30}>
        <ProgressCompat.Indicator {...indicatorProps} testID="alloc-indicator" />
      </ProgressCompat>,
    )
    const indicator = container.querySelector('[data-testid="alloc-indicator"]')
    expect(indicator).not.toBeNull()
    expect(indicator?.parentElement).toBe(getBar(container))
  })

  it('honours max in the fill geometry, not a literal 100', () => {
    const { container } = render(
      <ProgressCompat value={1} max={4}>
        <ProgressCompat.Indicator testID="geo-indicator" />
      </ProgressCompat>,
    )
    const indicator = container.querySelector('[data-testid="geo-indicator"]')
    // jsdom reports width 0, so the indicator uses the 300px pre-measurement
    // fallback: 25% filled (value/max) leaves 75% unfilled → translateX(-225px).
    // The legacy `/100` bug would slide it to translateX(-9px) (~97% filled).
    expect(indicator?.getAttribute('style')).toContain('translateX(-225px)')
  })

  it('renders the Allocation.tsx shape without throwing', () => {
    expect(() =>
      render(
        <ProgressCompat height="$spacing4" margin="$spacing2" backgroundColor="$transparent" value={Math.round(63.4)}>
          <ProgressCompat.Indicator {...indicatorProps} />
        </ProgressCompat>,
      ),
    ).not.toThrow()
  })
})

describe('ref forwarding', () => {
  it('forwards the root ref to the track element', () => {
    const ref = createRef<HTMLElement>()
    render(<ProgressCompat ref={ref} value={10} />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
    expect(ref.current?.getAttribute('role')).toBe('progressbar')
  })

  it('forwards the indicator ref to its element', () => {
    const ref = createRef<HTMLElement>()
    render(
      <ProgressCompat value={10}>
        <ProgressCompat.Indicator ref={ref} testID="ref-indicator" />
      </ProgressCompat>,
    )
    expect(ref.current).toBeInstanceOf(HTMLElement)
    expect(ref.current?.getAttribute('data-testid')).toBe('ref-indicator')
  })
})
