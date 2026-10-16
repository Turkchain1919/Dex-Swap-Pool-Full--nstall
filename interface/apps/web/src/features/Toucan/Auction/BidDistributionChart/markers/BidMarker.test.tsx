import { fireEvent, render } from '@testing-library/react'
import { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BidMarker } from '~/features/Toucan/Auction/BidDistributionChart/markers/BidMarker'
import type { MarkerPosition } from '~/features/Toucan/Auction/BidDistributionChart/markers/types'
import { AuctionStoreContext } from '~/features/Toucan/Auction/store/AuctionStoreContext'
import { createAuctionStore } from '~/features/Toucan/Auction/store/createAuctionStore'
import { AuctionBidStatus, BidInfoTab, BidTokenInfo, UserBid } from '~/features/Toucan/Auction/store/types'

// The avatar pulls the ENS/unitag avatar query and Tamagui's Unicon — irrelevant to the
// marker's click path, and neither renders without the full app provider tree.
vi.mock('uniswap/src/features/accounts/AccountIcon', () => ({
  AccountIcon: ({ address }: { address: string }) => <div>{address}</div>,
}))

const ADDRESS = '0x1111111111111111111111111111111111111111'

function makeBid(bidId: string): UserBid {
  return {
    bidId,
    auctionId: 'auction-1',
    walletId: ADDRESS,
    txHash: `0xtx-${bidId}`,
    amount: '1000000000000000000',
    maxPrice: '79228162514264337593543950336',
    createdAt: '2026-08-01T00:00:00.000Z',
    status: AuctionBidStatus.Submitted,
    baseTokenInitial: '1000000000000000000',
    currencySpent: '1000000000000000000',
  }
}

const BID_TOKEN_INFO: BidTokenInfo = {
  symbol: 'ETH',
  decimals: 18,
  priceFiat: 2000,
  isStablecoin: false,
  logoUrl: null,
}

function identity(value: string, _decimals: number): string {
  return value
}

function renderMarker(marker: MarkerPosition) {
  const store = createAuctionStore()

  function Wrapper({ children }: PropsWithChildren) {
    return <AuctionStoreContext.Provider value={store}>{children}</AuctionStoreContext.Provider>
  }

  const view = render(
    <Wrapper>
      <BidMarker marker={marker} bidTokenInfo={BID_TOKEN_INFO} formatPrice={identity} formatTokenAmount={identity} />
    </Wrapper>,
  )

  // BidMarker sets no testID; the compat trigger's own slot attribute is the stable handle.
  const trigger = view.container.querySelector('[data-slot="tooltip-compat-trigger"]')
  if (!trigger) {
    throw new Error('tooltip-compat trigger did not render')
  }
  return { store, trigger }
}

// Pins the reworked trigger wiring: style/gesture props sit directly on Tooltip.Trigger
// (no asChild child), so `onPress` must still reach the DOM as a working click handler
// after Base UI merges its own hover/ARIA props onto the trigger element.
describe('BidMarker click path', () => {
  it('clicking a single-bid marker selects the bid and switches to the My Bids tab', () => {
    const bid = makeBid('bid-1')
    const { store, trigger } = renderMarker({
      id: 'marker-1',
      left: 10,
      top: 20,
      address: ADDRESS,
      bids: [bid],
      bidRangeMap: { 'bid-1': true },
    })

    fireEvent.click(trigger)

    expect(store.getState().chartSelectedBid).toEqual({ bidId: 'bid-1', isInRange: true })
    expect(store.getState().activeBidFormTab).toBe(BidInfoTab.MY_BIDS)
  })

  it('clicking a multi-bid marker leaves the selection untouched', () => {
    const { store, trigger } = renderMarker({
      id: 'marker-2',
      left: 10,
      top: 20,
      address: ADDRESS,
      bids: [makeBid('bid-1'), makeBid('bid-2')],
      bidRangeMap: { 'bid-1': true, 'bid-2': false },
    })

    fireEvent.click(trigger)

    expect(store.getState().chartSelectedBid).toBeNull()
    expect(store.getState().activeBidFormTab).toBe(BidInfoTab.PLACE_A_BID)
  })
})
