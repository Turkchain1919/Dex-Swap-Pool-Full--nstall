import { render, screen } from '@testing-library/react'
import { Text } from '@universe/mycelium'
import { withDelay, withSpring } from 'react-native-reanimated'
import {
  ANIMATE_IN_ORDER_DELAY_MS,
  ANIMATE_IN_ORDER_SPRING,
  DEFAULT_ENTER_STYLE,
} from 'ui/src/animations/components/AnimateInOrder.constants'
import { AnimateInOrder } from 'ui/src/animations/components/AnimateInOrder.native'
import { SharedUIUniswapProvider } from 'ui/src/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const CHILD_TEXT = 'artwork'

function renderAtIndex(index: number): void {
  render(
    <SharedUIUniswapProvider>
      <AnimateInOrder index={index}>
        <Text>{CHILD_TEXT}</Text>
      </AnimateInOrder>
    </SharedUIUniswapProvider>,
  )
}

// The native leg is the one that fixes CONS-2903, and the bare-specifier test resolves to
// `.web.tsx` under vitest, so it is imported by explicit path here.
describe('AnimateInOrder (native)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children on the first commit, before the stagger delay elapses', () => {
    renderAtIndex(12)

    expect(screen.getByText(CHILD_TEXT)).toBeDefined()
  })

  it('drives the reveal to a resting opacity/scale of 1 with a spring, not with enterStyle', () => {
    renderAtIndex(2)

    expect(withSpring).toHaveBeenCalledWith(1, ANIMATE_IN_ORDER_SPRING)
  })

  it('staggers the spring by index * delayMs', () => {
    renderAtIndex(4)

    expect(withDelay).toHaveBeenCalledWith(4 * ANIMATE_IN_ORDER_DELAY_MS, expect.anything())
  })

  it('starts from the enterStyle values rather than from a visible resting style', () => {
    renderAtIndex(1)

    const wrapper = screen.getByText(CHILD_TEXT).parentElement as HTMLElement
    expect(window.getComputedStyle(wrapper).opacity).toBe(String(DEFAULT_ENTER_STYLE.opacity))
  })
})
