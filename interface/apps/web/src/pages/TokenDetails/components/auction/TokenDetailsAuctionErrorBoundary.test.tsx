import { UniverseChainId } from '@universe/chains'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TokenDetailsAuctionErrorBoundary } from '~/pages/TokenDetails/components/auction/TokenDetailsAuctionErrorBoundary'
import { render, screen } from '~/test-utils/render'

const TOKEN_ADDRESS = '0x1111111111111111111111111111111111111111'
let mockIdentity = { currencyChainId: UniverseChainId.Mainnet, address: TOKEN_ADDRESS }

vi.mock('~/pages/TokenDetails/context/useTDPStore', () => ({
  useTDPStore: (selector: (s: typeof mockIdentity) => unknown) => selector(mockIdentity),
}))

function CrashingSection(): JSX.Element {
  throw new Error('auction section exploded')
}

describe('TokenDetailsAuctionErrorBoundary', () => {
  beforeEach(() => {
    mockIdentity = { currencyChainId: UniverseChainId.Mainnet, address: TOKEN_ADDRESS }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('contains a crashing auction section and leaves the rest of the page standing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <>
        <TokenDetailsAuctionErrorBoundary>
          <CrashingSection />
        </TokenDetailsAuctionErrorBoundary>
        <span>rest of the page</span>
      </>,
    )

    expect(screen.getByText('rest of the page')).toBeInTheDocument()
    expect(screen.queryByText(/something went wrong/i)).toBeNull()
  })

  it.each([
    ['token', { currencyChainId: UniverseChainId.Mainnet, address: '0x2222222222222222222222222222222222222222' }],
    ['chain', { currencyChainId: UniverseChainId.Base, address: TOKEN_ADDRESS }],
  ] as const)('recovers a failed section when the %s changes', (_label, nextIdentity) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const { rerender } = render(
      <TokenDetailsAuctionErrorBoundary>
        <CrashingSection />
      </TokenDetailsAuctionErrorBoundary>,
    )
    const healthySection = () => (
      <TokenDetailsAuctionErrorBoundary>
        <span>Auction info for the next token</span>
      </TokenDetailsAuctionErrorBoundary>
    )

    rerender(healthySection())
    expect(screen.queryByText('Auction info for the next token')).toBeNull()

    mockIdentity = nextIdentity
    rerender(healthySection())
    expect(screen.getByText('Auction info for the next token')).toBeInTheDocument()
  })
})
