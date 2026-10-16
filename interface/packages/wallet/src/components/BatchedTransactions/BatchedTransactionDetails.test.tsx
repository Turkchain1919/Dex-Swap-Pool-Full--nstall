import { fireEvent } from '@testing-library/react-native'
import { UniverseChainId } from '@universe/chains'
import { Call } from 'wallet/src/features/dappRequests/types'
import { renderWithProviders } from 'wallet/src/test/render'

const platformState = vi.hoisted(() => ({ isExtensionApp: true, isMobileApp: false }))

// The carousel scroll path is extension-only: `isExtensionApp` chooses the
// scrollable div over the native FlatList.
vi.mock('@universe/environment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/environment')>()
  return {
    ...actual,
    get isExtensionApp() {
      return platformState.isExtensionApp
    },
    get isMobileApp() {
      return platformState.isMobileApp
    },
  }
})

// Stub the carousel chrome so this component's own gradient/arrow state is
// observable without rendering the real overlays.
vi.mock('uniswap/src/components/BatchedTransactions/CarouselControls', () => ({
  GradientOverlay: ({ position, show }: { position: 'left' | 'right'; show: boolean }): JSX.Element | null =>
    show ? <div data-testid={`gradient-${position}`} /> : null,
  ScrollArrow: ({ side }: { side: 'left' | 'right' }): JSX.Element => <div data-testid={`arrow-${side}`} />,
}))

// Card contents play no part in scroll behavior.
vi.mock('wallet/src/features/transactions/TransactionRequest/SpendingDetails', () => ({
  SpendingEthDetails: (): null => null,
}))
vi.mock('uniswap/src/components/transactions/requests/ContentRow', () => ({
  ContentRow: ({ children }: { children?: React.ReactNode }): JSX.Element => <>{children}</>,
}))
vi.mock('wallet/src/components/buttons/AddressButton', () => ({
  AddressButton: (): null => null,
}))
vi.mock('wallet/src/components/copy/useCopyToClipboard', () => ({
  useCopyToClipboard: () => async (): Promise<void> => undefined,
}))

import { BatchedTransactionDetails } from 'wallet/src/components/BatchedTransactions/BatchedTransactionDetails'

const calls = [
  { to: undefined, value: '0x0', data: '0xaaaa' },
  { to: undefined, value: '0x0', data: '0xbbbb' },
  { to: undefined, value: '0x0', data: '0xcccc' },
] as Call[]

const GRADIENT_THRESHOLD_RATIO = 0.25
const CLIENT_WIDTH = 300
const SCROLL_WIDTH = 5300

// The shared vitest setup maps @testing-library/react-native onto
// @testing-library/react, so this really is the DOM fireEvent and takes a real
// element; RNTL's published types still describe the native one.
const fireDomEvent = fireEvent as unknown as { scroll: (element: Element) => void }

const shown = (id: string): boolean => document.body.querySelector(`[data-testid="${id}"]`) !== null

function renderCarousel(): (metrics: { scrollLeft: number; clientWidth?: number; scrollWidth?: number }) => void {
  renderWithProviders(<BatchedTransactionDetails calls={calls} chainId={UniverseChainId.Mainnet} parentWidth={400} />)

  // The call cards are direct children of the scrollable element, so this
  // reaches the exact node the compat Flex rendered.
  const card = document.body.querySelector('[style*="scroll-snap-align"]')
  const scrollable = card?.parentElement
  if (!scrollable) {
    throw new Error('carousel scroll container not found')
  }

  return ({ scrollLeft, clientWidth = CLIENT_WIDTH, scrollWidth = SCROLL_WIDTH }): void => {
    // jsdom does no layout, so the three metrics the handler reads are supplied
    // directly. They are its inputs; the gradient and index decisions computed
    // from them are what is under test.
    Object.defineProperty(scrollable, 'scrollLeft', { value: scrollLeft, configurable: true })
    Object.defineProperty(scrollable, 'scrollWidth', { value: scrollWidth, configurable: true })
    Object.defineProperty(scrollable, 'clientWidth', { value: clientWidth, configurable: true })
    fireDomEvent.scroll(scrollable)
  }
}

describe('BatchedTransactionDetails carousel (extension)', () => {
  it('delivers scroll events to the handler at all', () => {
    const scrollTo = renderCarousel()

    // This asserts wiring, not arithmetic. `onScroll` reaches the rendered
    // element only because mycelium's FORWARDED_EVENT_PROPS allowlist carries
    // it; while it did not, the compat Flex dropped the prop silently and the
    // overlays never moved.
    expect(shown('gradient-left')).toBe(false)

    scrollTo({ scrollLeft: 5000 })

    expect(shown('gradient-left')).toBe(true)
  })

  it('opens with only the right gradient, at the left edge of the carousel', () => {
    renderCarousel()

    expect(shown('gradient-right')).toBe(true)
    expect(shown('gradient-left')).toBe(false)
  })

  it('shows both gradients part-way along', () => {
    const scrollTo = renderCarousel()

    // 200px scrolled and 4800px still to come: both edges sit beyond the 25%
    // threshold of the 300px viewport (75px).
    scrollTo({ scrollLeft: 200 })

    expect(shown('gradient-left')).toBe(true)
    expect(shown('gradient-right')).toBe(true)
  })

  it('drops the right gradient at the end of the carousel', () => {
    const scrollTo = renderCarousel()

    // scrollLeft + clientWidth === scrollWidth, so distanceFromEnd is 0.
    scrollTo({ scrollLeft: SCROLL_WIDTH - CLIENT_WIDTH })

    expect(shown('gradient-right')).toBe(false)
    expect(shown('gradient-left')).toBe(true)
  })

  it('brings the right gradient back when scrolled just inside the threshold', () => {
    const scrollTo = renderCarousel()

    // Park at the end first so the right gradient is genuinely off; otherwise
    // this would pass on the opening state alone.
    scrollTo({ scrollLeft: SCROLL_WIDTH - CLIENT_WIDTH })
    expect(shown('gradient-right')).toBe(false)

    const distanceFromEnd = CLIENT_WIDTH * GRADIENT_THRESHOLD_RATIO + 1
    scrollTo({ scrollLeft: SCROLL_WIDTH - CLIENT_WIDTH - distanceFromEnd })

    expect(shown('gradient-right')).toBe(true)
  })

  it('moves the arrows with the scrolled-to index', () => {
    const scrollTo = renderCarousel()

    expect(shown('arrow-left')).toBe(false)
    expect(shown('arrow-right')).toBe(true)

    // A large scrollLeft clamps the index to the last call, so this does not
    // depend on the measured snap interval.
    scrollTo({ scrollLeft: 5000 })

    expect(shown('arrow-left')).toBe(true)
    expect(shown('arrow-right')).toBe(false)
  })
})
