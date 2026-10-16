import { UniverseChainId } from '@universe/chains'
import { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BidReceiveOutput } from '~/features/Toucan/Auction/BidForm/BidReceiveOutput'
import { AuctionStoreContext } from '~/features/Toucan/Auction/store/AuctionStoreContext'
import { createAuctionStore } from '~/features/Toucan/Auction/store/createAuctionStore'
import { AuctionDetails } from '~/features/Toucan/Auction/store/types'
import { fireEvent, render, screen } from '~/test-utils/render'

const AUCTION_ADDRESS = '0x9D908e12c463e6ae0f074bF3Af56DedeD0cA1949'
const MAX_FDV_DISPLAY = '$25.2K FDV'

// The bid-token lookup is a network read, and the auction value formatter needs
// LocalizationContext, which the web test harness does not mount. Neither produces the per-token
// figure under test: that is derived from budget / expected amount inside the component.
vi.mock('~/features/Toucan/Auction/hooks/useBidTokenInfo', () => ({
  useBidTokenInfo: () => ({
    bidTokenInfo: { symbol: 'ETH', decimals: 18, priceFiat: 4000, isStablecoin: false, logoUrl: null },
    loading: false,
  }),
}))
vi.mock('~/features/Toucan/Auction/hooks/useAuctionValueFormatters', () => ({
  useAuctionValueFormatters: () => ({
    formatPrice: () => MAX_FDV_DISPLAY,
    formatTokenAmount: () => '0',
  }),
}))

function renderExpandedExplainer({
  budgetAmount,
  expectedAmount,
}: {
  budgetAmount: number
  expectedAmount: number
}): string {
  const store = createAuctionStore(AUCTION_ADDRESS, UniverseChainId.Mainnet)
  store.getState().actions.setAuctionDetails({
    address: AUCTION_ADDRESS,
    chainId: UniverseChainId.Mainnet,
    currency: '0x0000000000000000000000000000000000000000',
    tokenTotalSupply: '1000000000000000000000000000',
  } as AuctionDetails)

  function Wrapper({ children }: PropsWithChildren) {
    return <AuctionStoreContext.Provider value={store}>{children}</AuctionStoreContext.Provider>
  }

  const { container } = render(
    <Wrapper>
      <BidReceiveOutput
        expectedAmount={expectedAmount}
        minExpectedAmount={expectedAmount}
        tokenSymbol="TEST"
        maxPriceQ96={123n}
        bidTokenDecimals={18}
        budgetAmount={budgetAmount}
        bidTokenSymbol="ETH"
      />
    </Wrapper>,
  )

  // The partial-fill explainer sits behind the collapsed "Receive" row.
  fireEvent.click(screen.getByText('Receive'))

  return container.textContent
}

describe('BidReceiveOutput partial-fill explainer', () => {
  it('renders a tiny per-token price in subscript notation, never as zero', () => {
    // 0.063 ETH of budget over 10M tokens is 6.3e-9 ETH/token. The previous fixed-decimal
    // formatter (maximumFractionDigits: 6) rendered that as "0.00 ETH/token" — the reported bug.
    const text = renderExpandedExplainer({ budgetAmount: 0.063, expectedAmount: 10_000_000 })

    expect(text).toContain('0.0₈63 ETH/token')
    expect(text).not.toContain('0.00 ETH/token')
    // The localized sentence and its other placeholders still resolve around the figure.
    expect(text).toContain(`goes over ${MAX_FDV_DISPLAY}`)
    expect(text).toContain('won’t spend all your budget')
  })

  it('keeps per-token prices at or above the subscript threshold on fixed-decimal formatting', () => {
    const text = renderExpandedExplainer({ budgetAmount: 5, expectedAmount: 2 })

    expect(text).toContain('2.50 ETH/token')
  })
})
