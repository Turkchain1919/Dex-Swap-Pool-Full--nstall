import { waitFor } from '@testing-library/react-native'
import { UniverseChainId } from '@universe/chains'
import { useTokenDetailsContext } from 'src/components/TokenDetails/TokenDetailsContext'
import { useTDPHighestTvlChain } from 'src/screens/TokenDetailsScreen/useHighestTvlChain'
import { renderHookWithProviders } from 'src/test/render'
import { nativeAddressForRest } from 'uniswap/src/features/dataApi/utils/currencyIdToContractInput'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'
import type { MockedFunction } from 'vitest'

const { mockGetGetTokenMarketsQueryOptions, mockUseBalances } = vi.hoisted(() => ({
  mockGetGetTokenMarketsQueryOptions: vi.fn(),
  mockUseBalances: vi.fn(),
}))

vi.mock('uniswap/src/data/apiClients/dataApiService/tokens/queries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('uniswap/src/data/apiClients/dataApiService/tokens/queries')>()),
  getGetTokenMarketsQueryOptions: mockGetGetTokenMarketsQueryOptions,
}))

vi.mock('uniswap/src/data/apiClients/dataApiService/balances/hooks/useBalances', () => ({
  useBalances: (params: unknown) => mockUseBalances(params),
}))

vi.mock('src/components/TokenDetails/TokenDetailsContext', () => ({
  useTokenDetailsContext: vi.fn(),
}))

const mockUseTokenDetailsContext = useTokenDetailsContext as MockedFunction<typeof useTokenDetailsContext>

const ETH_ADDRESS = '0xEthAddress'
const BASE_ADDRESS = '0xBaseAddress'
const ARB_ADDRESS = '0xArbAddress'

type MultichainTokens = ReturnType<typeof useTokenDetailsContext>['multichainTokens']

type MarketsQueryOptionsArgs = { params?: { tokens: Array<{ chainId: number; address?: string }> } }

// The provider tree shares one QueryClient across tests, so each scenario needs its own cache keys.
let scenarioId = 0

/**
 * Mirrors the real query-options builder's contract: queryFn returns the raw REST response and
 * `select` (the hook's own selector) is left for react-query to apply, so that selector is
 * exercised for real by these tests.
 */
function mockScenario({
  multichainTokens,
  tvlUsdByChainId,
}: {
  multichainTokens: MultichainTokens
  tvlUsdByChainId?: Record<number, number | undefined>
}): void {
  scenarioId += 1
  const scenario = scenarioId
  mockUseTokenDetailsContext.mockReturnValue({ multichainTokens } as ReturnType<typeof useTokenDetailsContext>)
  mockGetGetTokenMarketsQueryOptions.mockImplementation(({ params, select }) => ({
    queryKey: [ReactQueryCacheKey.DataApiService, 'getTokenMarkets', scenario, params],
    queryFn: () =>
      Promise.resolve({
        markets: Object.entries(tvlUsdByChainId ?? {}).map(([chainId, totalValueLockedUsd]) => ({
          chainId: Number(chainId),
          stats: { totalValueLockedUsd },
        })),
      }),
    enabled: !!params,
    select,
  }))
}

const MULTICHAIN_TOKENS: MultichainTokens = [
  { chainId: UniverseChainId.Mainnet, address: ETH_ADDRESS },
  { chainId: UniverseChainId.Base, address: BASE_ADDRESS },
  { chainId: UniverseChainId.ArbitrumOne, address: ARB_ADDRESS },
]

const MULTICHAIN_TVL = {
  multichainTokens: MULTICHAIN_TOKENS,
  tvlUsdByChainId: {
    [UniverseChainId.Mainnet]: 500_000,
    [UniverseChainId.Base]: 2_000_000,
    [UniverseChainId.ArbitrumOne]: 300_000,
  },
}

describe(useTDPHighestTvlChain, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBalances.mockReturnValue(null)
  })

  it('returns the chain with the highest TVL', async () => {
    mockScenario(MULTICHAIN_TVL)

    const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({}))

    await waitFor(() => expect(result.current.chainId).toBe(UniverseChainId.Base))
    expect(result.current.address).toBe(BASE_ADDRESS)
  })

  it('returns null when the token has no chain deployments', async () => {
    mockScenario({ multichainTokens: [] })

    const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({}))

    // With no deployments there is nothing to price, so no markets request is ever made.
    await waitFor(() =>
      expect(mockGetGetTokenMarketsQueryOptions).toHaveBeenCalledWith(expect.objectContaining({ params: undefined })),
    )
    expect(result.current.chainId).toBeNull()
    expect(result.current.address).toBeNull()
  })

  it('returns null when all TVL values are 0', async () => {
    mockScenario({
      multichainTokens: [
        { chainId: UniverseChainId.Mainnet, address: ETH_ADDRESS },
        { chainId: UniverseChainId.Base, address: BASE_ADDRESS },
      ],
      tvlUsdByChainId: { [UniverseChainId.Mainnet]: 0, [UniverseChainId.Base]: 0 },
    })

    const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({}))

    await waitFor(() => expect(mockGetGetTokenMarketsQueryOptions).toHaveBeenCalled())
    expect(result.current.chainId).toBeNull()
    expect(result.current.address).toBeNull()
  })

  it('returns null when market data is missing', async () => {
    mockScenario({
      multichainTokens: [
        { chainId: UniverseChainId.Mainnet, address: ETH_ADDRESS },
        { chainId: UniverseChainId.Base, address: BASE_ADDRESS },
      ],
      tvlUsdByChainId: { [UniverseChainId.Mainnet]: undefined, [UniverseChainId.Base]: undefined },
    })

    const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({}))

    await waitFor(() => expect(mockGetGetTokenMarketsQueryOptions).toHaveBeenCalled())
    expect(result.current.chainId).toBeNull()
    expect(result.current.address).toBeNull()
  })

  it('handles single-chain tokens', async () => {
    mockScenario({
      multichainTokens: [{ chainId: UniverseChainId.Mainnet, address: ETH_ADDRESS }],
      tvlUsdByChainId: { [UniverseChainId.Mainnet]: 1_000_000 },
    })

    const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({}))

    await waitFor(() => expect(result.current.chainId).toBe(UniverseChainId.Mainnet))
    expect(result.current.address).toBe(ETH_ADDRESS)
  })

  it('sends the REST native address for native tokens and reports the address back as null', async () => {
    // The context normalizes native deployments to a null address. GetTokenMarkets indexes natives
    // by address, so the request carries the REST placeholder while callers still receive null.
    mockScenario({
      multichainTokens: [{ chainId: UniverseChainId.Mainnet, address: null }],
      tvlUsdByChainId: { [UniverseChainId.Mainnet]: 1_000_000 },
    })

    const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({}))

    await waitFor(() => expect(result.current.chainId).toBe(UniverseChainId.Mainnet))
    expect(result.current.address).toBeNull()
    const [args] = mockGetGetTokenMarketsQueryOptions.mock.lastCall as [MarketsQueryOptionsArgs]
    expect(args.params?.tokens).toEqual([
      { chainId: UniverseChainId.Mainnet, address: nativeAddressForRest(UniverseChainId.Mainnet) },
    ])
  })

  describe('gas balance fallback (when accountAddress is provided)', () => {
    const accountAddress = '0xUser' as Address

    function mockGasBalances(entries: Array<{ chainId: number; quantity: number }>): void {
      mockUseBalances.mockReturnValue(
        entries.map(({ chainId, quantity }) => ({
          quantity,
          currencyInfo: { currency: { chainId } },
        })),
      )
    }

    it('skips the highest-TVL chain when the user has no gas there', async () => {
      mockScenario(MULTICHAIN_TVL)
      // User has gas on Ethereum and Arbitrum but not Base (the highest-TVL chain).
      mockGasBalances([
        { chainId: UniverseChainId.Mainnet, quantity: 0.5 },
        { chainId: UniverseChainId.ArbitrumOne, quantity: 0.1 },
      ])

      const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({ accountAddress }))

      // Ethereum is the next-highest-TVL chain with gas.
      await waitFor(() => expect(result.current.chainId).toBe(UniverseChainId.Mainnet))
      expect(result.current.address).toBe(ETH_ADDRESS)
    })

    it('returns the highest-TVL chain when the user has gas there', async () => {
      mockScenario(MULTICHAIN_TVL)
      mockGasBalances([{ chainId: UniverseChainId.Base, quantity: 0.01 }])

      const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({ accountAddress }))

      await waitFor(() => expect(result.current.chainId).toBe(UniverseChainId.Base))
      expect(result.current.address).toBe(BASE_ADDRESS)
    })

    it('falls back to the highest-TVL chain when the user has no gas anywhere', async () => {
      mockScenario(MULTICHAIN_TVL)
      mockUseBalances.mockReturnValue([])

      const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({ accountAddress }))

      await waitFor(() => expect(result.current.chainId).toBe(UniverseChainId.Base))
      expect(result.current.address).toBe(BASE_ADDRESS)
    })

    it('ignores chains with zero gas balance', async () => {
      mockScenario(MULTICHAIN_TVL)
      // Both balance entries exist but Base is zeroed out.
      mockGasBalances([
        { chainId: UniverseChainId.Base, quantity: 0 },
        { chainId: UniverseChainId.Mainnet, quantity: 0.2 },
      ])

      const { result } = renderHookWithProviders(() => useTDPHighestTvlChain({ accountAddress }))

      await waitFor(() => expect(result.current.chainId).toBe(UniverseChainId.Mainnet))
      expect(result.current.address).toBe(ETH_ADDRESS)
    })
  })
})
