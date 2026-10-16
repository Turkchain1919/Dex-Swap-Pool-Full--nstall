import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { useAuctionRedemption } from '~/features/Toucan/Auction/hooks/useAuctionRedemption'

const mockUnderlyingTokenRead = vi.fn<(params: unknown) => { data: string | undefined; isLoading: boolean }>()
const mockStoreState: { auctionDetails: { chainId: UniverseChainId; tokenAddress: string } | undefined } = {
  auctionDetails: undefined,
}

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>()
  return {
    ...actual,
    useReadContract: (params: unknown) => mockUnderlyingTokenRead(params),
  }
})

vi.mock('~/features/Toucan/Auction/store/useAuctionStore', () => ({
  useAuctionStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}))

const CAP_RECEIPT_ADDRESS = '0x9999B7E3cc6979223Ff1aF980b7D8B90B75d9999'
const CAP_UNDERLYING_ADDRESS = '0x2222222222222222222222222222222222222222'

describe('useAuctionRedemption', () => {
  beforeEach(() => {
    mockStoreState.auctionDetails = undefined
    mockUnderlyingTokenRead.mockReset()
    mockUnderlyingTokenRead.mockReturnValue({ data: undefined, isLoading: false })
  })

  it('does not offer redemption or read an underlying token before auction details are available', () => {
    const { result } = renderHook(() => useAuctionRedemption())

    expect(result.current).toEqual({
      isRedeemable: false,
      redeemUrl: undefined,
      realTokenAddress: undefined,
      chainId: undefined,
      loading: false,
    })
    expect(mockUnderlyingTokenRead).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }),
    )
  })

  it('keeps IDOS outside the redemption flow even though its trading token differs', () => {
    mockStoreState.auctionDetails = {
      chainId: UniverseChainId.ArbitrumOne,
      tokenAddress: '0xb628B89067E8f7Dfc2cB528a72BcfF7d5cEDcE29',
    }

    const { result } = renderHook(() => useAuctionRedemption())

    expect(result.current).toEqual({
      isRedeemable: false,
      redeemUrl: undefined,
      realTokenAddress: undefined,
      chainId: UniverseChainId.ArbitrumOne,
      loading: false,
    })
    expect(mockUnderlyingTokenRead).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }),
    )
  })

  it('preserves CAP redemption details and the underlying token returned by its receipt contract', () => {
    mockStoreState.auctionDetails = { chainId: UniverseChainId.Mainnet, tokenAddress: CAP_RECEIPT_ADDRESS }
    mockUnderlyingTokenRead.mockReturnValue({ data: CAP_UNDERLYING_ADDRESS, isLoading: false })

    const { result } = renderHook(() => useAuctionRedemption())

    expect(result.current).toEqual({
      isRedeemable: true,
      redeemUrl: 'https://redeem.caplabslimited.com/',
      realTokenAddress: CAP_UNDERLYING_ADDRESS,
      chainId: UniverseChainId.Mainnet,
      loading: false,
    })
    expect(mockUnderlyingTokenRead).toHaveBeenCalledWith(
      expect.objectContaining({
        address: CAP_RECEIPT_ADDRESS,
        chainId: UniverseChainId.Mainnet,
        functionName: 'UNDERLYING_TOKEN_ADDRESS',
        query: expect.objectContaining({ enabled: true }),
      }),
    )
  })

  it('reports loading while the CAP underlying-token read is pending', () => {
    mockStoreState.auctionDetails = { chainId: UniverseChainId.Mainnet, tokenAddress: CAP_RECEIPT_ADDRESS }
    mockUnderlyingTokenRead.mockReturnValue({ data: undefined, isLoading: true })

    const { result } = renderHook(() => useAuctionRedemption())

    expect(result.current).toEqual({
      isRedeemable: true,
      redeemUrl: 'https://redeem.caplabslimited.com/',
      realTokenAddress: undefined,
      chainId: UniverseChainId.Mainnet,
      loading: true,
    })
  })
})
