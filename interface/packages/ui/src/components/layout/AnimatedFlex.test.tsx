import { render } from '@testing-library/react'
// The bare specifier resolves to `.web.tsx` under vitest — exactly the leg
// whose prop-strip contract this file pins (INFRA-3341 leaves it untouched).
import { AnimatedFlex } from 'ui/src/components/layout/AnimatedFlex'
import { SharedUIUniswapProvider } from 'ui/src/test/render'
import { describe, expect, it } from 'vitest'

describe('AnimatedFlex (web)', () => {
  it('strips the Reanimated entering/exiting/layout props before they reach the DOM', () => {
    // Placeholder builders: the strip contract is about the prop KEYS never
    // reaching the DOM, whatever their value (the lane's reanimated mock does
    // not export every preset, so real builders are not usable here anyway).
    const preset = { build: (): Record<string, never> => ({}) }
    const { container } = render(
      <SharedUIUniswapProvider>
        <AnimatedFlex entering={preset} exiting={preset} layout={preset} testID="stripped" />
      </SharedUIUniswapProvider>,
    )

    const element = container.querySelector('[data-testid="stripped"]')
    expect(element).not.toBeNull()
    for (const stripped of ['entering', 'exiting', 'layout']) {
      expect(element?.hasAttribute(stripped)).toBe(false)
    }
  })

  it('flattens an array-form style onto the rendered host', () => {
    // BaseCard's `[scaleAnchor, animatedStyle]` shape also renders through
    // this untouched web leg — pin that array members compose onto the DOM
    // host instead of being dropped by a spread-style merge.
    const { container } = render(
      <SharedUIUniswapProvider>
        <AnimatedFlex style={[{ transformOrigin: 'center bottom' }, { opacity: 0.5 }]} testID="array-style-web" />
      </SharedUIUniswapProvider>,
    )

    const element = container.querySelector<HTMLElement>('[data-testid="array-style-web"]')
    expect(element).not.toBeNull()
    expect(element?.style.transformOrigin).toBe('center bottom')
    expect(element?.style.opacity).toBe('0.5')
  })

  it('forwards the caller ref to the rendered Flex host', () => {
    let refValue: unknown
    render(
      <SharedUIUniswapProvider>
        <AnimatedFlex
          ref={(node: unknown): void => {
            refValue = node
          }}
          testID="ref-web"
        />
      </SharedUIUniswapProvider>,
    )

    expect(refValue).toBeInstanceOf(HTMLElement)
  })
})
