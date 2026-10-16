import { UniverseChainId } from '@universe/chains'
import { PoolSortFields } from '~/data/pools/poolStats'
import { usePoolsFromTokenAddress } from '~/data/pools/usePoolsFromTokenAddress'
import { OrderDirection } from '~/data/util'
import { useV2ListTokenPools } from '~/pages/Explore/hooks/useV2ListTokenPools'
import { useV2ListTokenPoolsMultichain } from '~/pages/Explore/hooks/useV2ListTokenPoolsMultichain'
import { renderHook } from '~/test-utils/render'

vi.mock('~/pages/Explore/hooks/useV2ListTokenPools')
vi.mock('~/pages/Explore/hooks/useV2ListTokenPoolsMultichain')

const mockUseV2ListTokenPools = vi.mocked(useV2ListTokenPools)
const mockUseV2ListTokenPoolsMultichain = vi.mocked(useV2ListTokenPoolsMultichain)

const SINGLE_CHAIN_SENTINEL = [{ id: 'single-chain-pool' }] as never
const MULTICHAIN_SENTINEL = [{ id: 'multichain-pool' }] as never

const sortState = { sortBy: PoolSortFields.TVL, sortDirection: OrderDirection.Desc }

function makeEntry(chainId: UniverseChainId, address: string) {
  return { chainId, address, isNative: false }
}

describe('usePoolsFromTokenAddress', () => {
  beforeEach(() => {
    mockUseV2ListTokenPools.mockReturnValue({
      pools: SINGLE_CHAIN_SENTINEL,
      rawPoolCount: 1,
      isLoading: false,
      isSuccess: true,
      isFetchedAfterMount: true,
      refetch: vi.fn(),
      isError: false,
      loadMore: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })
    mockUseV2ListTokenPoolsMultichain.mockReturnValue({
      pools: MULTICHAIN_SENTINEL,
      isLoading: false,
      isError: false,
      loadMore: vi.fn(),
    })
  })

  it('uses the v2 single-chain path when the view is not multichain', () => {
    const { result } = renderHook(() =>
      usePoolsFromTokenAddress({
        tokenAddress: '0x1111111111111111111111111111111111111111',
        sortState,
        chainId: UniverseChainId.Mainnet,
        multichain: false,
        multichainEntries: [],
      }),
    )

    expect(result.current.pools).toBe(SINGLE_CHAIN_SENTINEL)
    expect(mockUseV2ListTokenPools).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    expect(mockUseV2ListTokenPoolsMultichain).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('uses the v2 multichain fan-out when the view is multichain with more than one EVM entry', () => {
    const { result } = renderHook(() =>
      usePoolsFromTokenAddress({
        tokenAddress: '0x1111111111111111111111111111111111111111',
        sortState,
        chainId: UniverseChainId.Mainnet,
        multichain: true,
        multichainEntries: [
          makeEntry(UniverseChainId.Mainnet, '0x1111111111111111111111111111111111111111'),
          makeEntry(UniverseChainId.Base, '0x2222222222222222222222222222222222222222'),
        ],
      }),
    )

    expect(result.current.pools).toBe(MULTICHAIN_SENTINEL)
    expect(mockUseV2ListTokenPoolsMultichain).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    expect(mockUseV2ListTokenPools).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('uses the v2 multichain path even when only a single EVM entry is known', () => {
    const { result } = renderHook(() =>
      usePoolsFromTokenAddress({
        tokenAddress: '0x1111111111111111111111111111111111111111',
        sortState,
        chainId: UniverseChainId.Mainnet,
        multichain: true,
        multichainEntries: [makeEntry(UniverseChainId.Mainnet, '0x1111111111111111111111111111111111111111')],
      }),
    )

    expect(result.current.pools).toBe(MULTICHAIN_SENTINEL)
    expect(mockUseV2ListTokenPoolsMultichain).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    expect(mockUseV2ListTokenPools).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })
})
