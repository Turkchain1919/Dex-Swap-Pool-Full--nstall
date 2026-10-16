/**
 * Behavior contract for the `LinearGradient` compat web leg,
 * asserted on the rendered DOM. The legacy reference is
 * `@tamagui/linear-gradient` (re-exported from the `ui/src` barrel): a YStack
 * frame (`overflow: hidden`, `position: relative`) whose first child is an
 * absolutely-filled element painting `linear-gradient(…)` behind the caller's
 * children, with the vendored expo-linear-gradient web angle math.
 */
import { cleanup, render } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { gradientAngleDegrees, gradientStopColor, linearGradientBackgroundImage } from './compile'
import { LinearGradientCompat } from './LinearGradientCompat'

afterEach(() => {
  cleanup()
})

function frameOf(container: HTMLElement): HTMLElement {
  const frame = container.firstElementChild
  if (!(frame instanceof HTMLElement)) {
    throw new Error('no frame rendered')
  }
  return frame
}

function gradientFillOf(container: HTMLElement): HTMLElement {
  const fill = frameOf(container).firstElementChild
  if (!(fill instanceof HTMLElement)) {
    throw new Error('no gradient fill rendered')
  }
  return fill
}

describe('stop color resolution (the compat color boundary)', () => {
  it('resolves semantic tokens to their auto-switching theme variable', () => {
    expect(gradientStopColor('$surface1')).toEqual({ kind: 'variable', name: '--surface1' })
    expect(gradientStopColor('$accent1')).toEqual({ kind: 'variable', name: '--accent1' })
  })

  it('resolves the theme-invariant tokens to their pinned literals', () => {
    expect(gradientStopColor('$transparent')).toEqual({ kind: 'literal', value: 'transparent' })
    expect(gradientStopColor('$white')).toEqual({ kind: 'literal', value: '#FFFFFF' })
  })

  it('resolves themed hovered tokens to their light-suffix alias (declared under both themes)', () => {
    expect(gradientStopColor('$surface1Hovered')).toEqual({ kind: 'variable', name: '--surface1-hovered' })
  })

  it('passes raw CSS colors through', () => {
    expect(gradientStopColor('rgba(0,0,0,0.5)')).toEqual({ kind: 'literal', value: 'rgba(0,0,0,0.5)' })
  })

  it('throws on a $ token outside the maps instead of guessing', () => {
    expect(() => gradientStopColor('$notAToken')).toThrow('has no @universe/tailwind counterpart')
  })
})

describe('gradient expression (the legacy web math)', () => {
  it('defaults to a top-to-bottom 180deg gradient', () => {
    expect(gradientAngleDegrees({})).toBe(180)
    expect(linearGradientBackgroundImage({ colors: ['#000000', '#ffffff'] })).toBe(
      'linear-gradient(180deg, #000000, #ffffff)',
    )
  })

  it('computes the horizontal axis angles from start/end points (object and tuple forms)', () => {
    expect(gradientAngleDegrees({ start: { x: 0, y: 0 }, end: { x: 1, y: 0 } })).toBe(90)
    expect(gradientAngleDegrees({ start: [1, 0], end: [0, 0] })).toBe(270)
  })

  it('scales diagonal angles by the measured box, like the legacy layout-dependent math', () => {
    expect(gradientAngleDegrees({ start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, width: 1, height: 1 })).toBe(135)
    const wide = gradientAngleDegrees({ start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, width: 100, height: 10 })
    expect(wide).toBeCloseTo(95.71, 2)
  })

  it('renders token stops as var() reads and positions located stops as percentages', () => {
    expect(linearGradientBackgroundImage({ colors: ['$surface1', 'transparent'], locations: [0, 0.75] })).toBe(
      'linear-gradient(180deg, var(--surface1), transparent 75%)',
    )
  })

  it('clamps out-of-range locations like the legacy implementation', () => {
    expect(linearGradientBackgroundImage({ colors: ['#000', '#fff'], locations: [0, 2] })).toBe(
      'linear-gradient(180deg, #000, #fff 100%)',
    )
  })

  it('emits no declaration below two stops — the native two-stop minimum, so both legs paint nothing', () => {
    expect(linearGradientBackgroundImage({})).toBeUndefined()
    expect(linearGradientBackgroundImage({ colors: [] })).toBeUndefined()
    expect(linearGradientBackgroundImage({ colors: ['#000'] })).toBeUndefined()
  })
})

describe('rendered structure (the legacy frame + fill + children order)', () => {
  it('paints the gradient on an absolutely-filled first child behind the children', () => {
    const { container } = render(
      <LinearGradientCompat colors={['$surface1', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <span>content</span>
      </LinearGradientCompat>,
    )
    // jsdom's cssstyle drops gradient background-image values entirely, so the
    // expression itself is pinned by the compile unit tests above; the DOM
    // assertion covers the fill geometry and the paint order.
    const fill = gradientFillOf(container)
    expect(fill.style.position).toBe('absolute')
    expect(fill.style.zIndex).toBe('0')
    expect(fill.style.top).toBe('0px')
    expect(fill.style.bottom).toBe('0px')
    const frame = frameOf(container)
    expect(frame.firstElementChild).toBe(fill)
    expect(frame.lastElementChild?.textContent).toBe('content')
  })

  it('applies the legacy frame defaults with caller props winning', () => {
    const { container } = render(<LinearGradientCompat colors={['#000', '#fff']} />)
    expect(frameOf(container).className).toContain('overflow-hidden')

    const { container: overridden } = render(
      <LinearGradientCompat colors={['#000', '#fff']} overflow="visible" position="absolute" />,
    )
    const frame = frameOf(overridden)
    expect(frame.className).toContain('overflow-visible')
    expect(frame.className).not.toContain('overflow-hidden')
    expect(frame.className).toContain('absolute')
  })

  it('carries the stack style surface on the frame (the held call sites: sizing + positioning + pointerEvents)', () => {
    const { container } = render(
      <LinearGradientCompat
        colors={['transparent', '$surface2']}
        height={64}
        width={24}
        pointerEvents="none"
        position="absolute"
        top={0}
        left={0}
        testID="fade"
      />,
    )
    const frame = frameOf(container)
    expect(frame.getAttribute('data-testid')).toBe('fade')
    expect(frame.className).toContain('absolute')
    expect(frame.className).toContain('top-[0px]')
  })
})
