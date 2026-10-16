import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuctionMaxBidPrice } from '~/features/Toucan/Auction/hooks/useAuctionMaxBidPrice'

// Sepolia auction 0xA91986C3…: floor 1e-08/token, tick 1e-10/token, ceiling 1e-06/token.
const FLOOR = 792281625142643375900n
const TICK = 7922816251426433759n
const CEILING = '79228162514264337593543'

const mockStoreState = {
  auctionAddress: '0xA91986C33BB542ee8b078E36eC21C513aC959192',
  auctionDetails: { chainId: 11155111, tokenTotalSupply: '100000000000000000000000000' },
}

vi.mock('~/features/Toucan/Auction/store/useAuctionStore', () => ({
  useAuctionStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}))

vi.mock('~/features/Toucan/Auction/hooks/useVerifyWalletParams', () => ({
  useVerifyWalletParams: () => ({}),
}))

vi.mock('uniswap/src/features/language/LocalizationContext', () => ({
  useLocalizationContext: () => ({ formatNumberOrString: ({ value }: { value: number }) => String(value) }),
}))

const mockQuery = vi.fn()
vi.mock('uniswap/src/data/apiClients/dataApiService/auctions/useVerifyWallet', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useVerifyWalletQuery: () => mockQuery(),
}))

function withCeiling(): { validations: unknown[] } {
  return { validations: [{ validationType: 3, data: { case: 'maxBidPriceData', value: { maxBidPriceQ96: CEILING } } }] }
}

function render() {
  return renderHook(() =>
    useAuctionMaxBidPrice({
      bidTokenDecimals: 18,
      auctionTokenDecimals: 18,
      clearingPriceQ96: FLOOR,
      floorPriceQ96: FLOOR,
      tickSizeQ96: TICK,
    }),
  )
}

describe('useAuctionMaxBidPrice across a wallet-connect refetch', () => {
  beforeEach(() => mockQuery.mockReset())

  it('keeps the ceiling while the wallet-keyed query is back in flight', () => {
    // walletAddress is part of the query key, so connecting starts a fresh fetch whose data
    // is undefined until it lands. Dropping the ceiling for that window would widen the
    // slider past it and leave the submitted price unclamped.
    mockQuery.mockReturnValue({ data: withCeiling() })
    const { result, rerender } = render()
    expect(result.current.maxBidPriceQ96).toBe(BigInt(CEILING))

    mockQuery.mockReturnValue({ data: undefined })
    rerender()

    expect(result.current.maxBidPriceQ96).toBe(BigInt(CEILING))
    expect(result.current.maxValidBidQ96).toBe(FLOOR + TICK * 9900n)
  })

  it('reports no ceiling for an auction that never had one', () => {
    mockQuery.mockReturnValue({ data: { validations: [] } })
    const { result } = render()

    expect(result.current.maxBidPriceQ96).toBeUndefined()
  })
})
