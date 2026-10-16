import { act, waitFor } from '@testing-library/react'
import { PositionStatus, ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Protocols } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { PositionStatus as LiquidityPositionStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { UniverseChainId } from '@universe/chains'
import { useLiquidityServiceWalletPositions } from 'uniswap/src/features/positions/hooks/useLiquidityServiceWalletPositions'
import { renderHookWithProviders } from 'uniswap/src/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetWalletPositions, mockUseEnabledChains, mockUsePositionVisibilityCheck } = vi.hoisted(() => ({
  mockGetWalletPositions: vi.fn(),
  mockUseEnabledChains: vi.fn(),
  mockUsePositionVisibilityCheck: vi.fn(),
}))

// The pinned @uniswap/client-liquidity (1.3.3) predates the GetWalletPositions surface, so the
// v2 PositionStatus enum doesn't exist at runtime yet; provide it (values match the proto).
vi.mock('@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb', () => ({
  PositionStatus: { UNSPECIFIED: 0, OPEN: 1, CLOSED: 2 },
}))

vi.mock('uniswap/src/data/apiClients/liquidityService/liquidityQueries', () => ({
  liquidityQueries: {
    getWalletPositions: mockGetWalletPositions,
  },
}))

// The real provider persists to IndexedDB, which doesn't exist in the test environment — the
// restore never settles and PersistQueryClientProvider pauses every query. Swap in a plain
// QueryClientProvider so the infinite query actually runs.
vi.mock('uniswap/src/data/apiClients/SharedPersistQueryClientProvider', async () => {
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
  const { createElement } = await import('react')
  const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    SharedPersistQueryClientProvider: ({ children }: { children?: unknown }) =>
      createElement(QueryClientProvider, { client: testQueryClient }, children as React.ReactNode),
  }
})

vi.mock('uniswap/src/features/chains/hooks/useEnabledChains', () => ({
  useEnabledChains: mockUseEnabledChains,
}))

vi.mock('uniswap/src/features/visibility/hooks/usePositionVisibilityCheck', () => ({
  usePositionVisibilityCheck: mockUsePositionVisibilityCheck,
}))

// ---------- Fixtures (raw liquidity-service Position shapes; parsed by the REAL parser) ----------

const DEFAULT_CHAINS = [UniverseChainId.Mainnet]
const OPEN_STATUSES = [LiquidityPositionStatus.OPEN]
const ALL_VERSIONS = [ProtocolVersion.V2, ProtocolVersion.V3, ProtocolVersion.V4]

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

/** Enriched V2 position — parses via the happy path. */
function v2Position(pairAddress: string, lpShares = '5000'): Record<string, unknown> {
  return {
    version: Protocols.V2,
    chainId: 1,
    poolAddressOrId: pairAddress,
    lpShares,
    token0Address: USDC,
    token1Address: WETH,
    token0Metadata: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    token1Metadata: { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    owner: '0x0000000000000000000000000000000000000123',
  }
}

/** V3 position with pool metadata enrichment missing — parses via the degraded-row fallback. */
function degradedV3Position(tokenId: string): Record<string, unknown> {
  return {
    version: Protocols.V3,
    chainId: 1,
    poolAddressOrId: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    tokenId,
    feeTier: 3000,
    tickLower: -60,
    tickUpper: 60,
    liquidity: '777',
    owner: '0x0000000000000000000000000000000000000123',
  }
}

/**
 * Configures the mocked liquidityQueries.getWalletPositions with a fixed page sequence.
 * Mirrors the real query options contract: cursor-based infinite query where getNextPageParam
 * returns the last page's nextCursor.
 */
function primePages(pages: { positions: Record<string, unknown>[] }[]): { queryFnCalls: unknown[] } {
  const queryFnCalls: unknown[] = []
  mockGetWalletPositions.mockImplementation(
    ({ params, enabled }: { params: Record<string, unknown>; enabled?: boolean }) => ({
      queryKey: ['test', 'getWalletPositions', params],
      queryFn: async ({ pageParam }: { pageParam?: number }): Promise<Record<string, unknown>> => {
        queryFnCalls.push(pageParam)
        const index = pageParam ?? 0
        const page = pages[index] ?? { positions: [] }
        return {
          positions: page.positions,
          nextCursor: index + 1 < pages.length ? index + 1 : undefined,
        }
      },
      initialPageParam: undefined,
      getNextPageParam: (lastPage: { nextCursor?: number }) => lastPage.nextCursor,
      enabled,
    }),
  )
  return { queryFnCalls }
}

let accountCounter = 0
/** Unique account per test so the shared test QueryClient never serves a stale cache entry. */
function nextAccount(): string {
  accountCounter += 1
  return `0xAccount${accountCounter}`
}

function renderLsPositions(
  overrides: Partial<Parameters<typeof useLiquidityServiceWalletPositions>[0]> = {},
): ReturnType<typeof renderHookWithProviders<ReturnType<typeof useLiquidityServiceWalletPositions>>> {
  // Resolved once, outside the render callback — the params feed the queryKey, so they must be
  // referentially stable across renders.
  const params = {
    account: nextAccount(),
    protocolVersions: ALL_VERSIONS,
    requestStatuses: OPEN_STATUSES,
    pageSize: 25,
    ...overrides,
  }
  return renderHookWithProviders(() => useLiquidityServiceWalletPositions(params))
}

describe('useLiquidityServiceWalletPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEnabledChains.mockReturnValue({ chains: DEFAULT_CHAINS })
    mockUsePositionVisibilityCheck.mockReturnValue(() => true)
    primePages([{ positions: [] }])
  })

  describe('pagination drain', () => {
    it('auto-drains all pages and preserves server ordering, including degraded rows', async () => {
      const { queryFnCalls } = primePages([
        { positions: [v2Position('0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc'), degradedV3Position('42')] },
        { positions: [v2Position('0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852')] },
      ])

      const { result } = renderLsPositions()

      await waitFor(() => expect(result.current.pagesLoaded).toBe(2))
      await waitFor(() => expect(result.current.hasNextPage).toBe(false))

      // First page fetched with no cursor, second with the returned cursor.
      expect(queryFnCalls).toEqual([undefined, 1])
      // All three positions present, in server order — the degraded row keeps its slot.
      expect(result.current.positions.map((p) => p.poolId)).toEqual([
        '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc',
        '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
        '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852',
      ])
    })

    it('fetches only the first page when autoFetchAllPages is false', async () => {
      primePages([
        { positions: [v2Position('0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc')] },
        { positions: [v2Position('0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852')] },
      ])

      const { result } = renderLsPositions({ autoFetchAllPages: false })

      await waitFor(() => expect(result.current.pagesLoaded).toBe(1))
      expect(result.current.hasNextPage).toBe(true)
      expect(result.current.positions).toHaveLength(1)
    })

    it('dedups a position repeated across overlapping pages but keeps same-pool positions with distinct tokenIds', async () => {
      primePages([
        { positions: [v2Position('0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc'), degradedV3Position('42')] },
        { positions: [degradedV3Position('42'), degradedV3Position('43')] },
      ])

      const { result } = renderLsPositions()

      await waitFor(() => expect(result.current.pagesLoaded).toBe(2))
      await waitFor(() => expect(result.current.hasNextPage).toBe(false))

      expect(result.current.positions.map((p) => `${p.poolId}:${p.tokenId ?? ''}`)).toEqual([
        '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc:',
        '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640:42',
        '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640:43',
      ])
    })
  })

  describe('degraded-row fallback', () => {
    it('does not drop a position whose pool metadata is unresolved', async () => {
      primePages([{ positions: [degradedV3Position('42')] }])

      const { result } = renderLsPositions()

      await waitFor(() => expect(result.current.hasData).toBe(true))
      await waitFor(() => expect(result.current.allPositions).toHaveLength(1))

      const degraded = result.current.allPositions[0]
      expect(degraded?.status).toBe(PositionStatus.UNSPECIFIED)
      expect(degraded?.poolOrPair).toBeUndefined()
      expect(degraded?.totalValueUsd).toBeUndefined()
      expect(degraded?.tokenId).toBe('42')
      // UNSPECIFIED status passes the client-side status filter — unknown is not excluded.
      expect(result.current.positions).toHaveLength(1)
    })
  })

  describe('client-side status filtering', () => {
    it('requests only OPEN server-side when open statuses are requested', async () => {
      primePages([{ positions: [] }])

      renderLsPositions({ requestStatuses: OPEN_STATUSES })

      expect(mockGetWalletPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ statuses: [1] }), // LiquidityPositionStatus.OPEN
        }),
      )
    })
  })

  describe('server-side search', () => {
    it('forwards a trimmed search term to the request', async () => {
      primePages([{ positions: [] }])

      renderLsPositions({ search: '  usdc  ' })

      expect(mockGetWalletPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ search: 'usdc' }),
        }),
      )
    })

    it('omits an empty/whitespace search so it shares the unfiltered query key', async () => {
      primePages([{ positions: [] }])

      renderLsPositions({ search: '   ' })

      expect(mockGetWalletPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ search: undefined }),
        }),
      )
    })
  })

  describe('visibility partition', () => {
    it('partitions hidden positions via the Redux visibility check', async () => {
      primePages([
        {
          positions: [
            v2Position('0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc'),
            v2Position('0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852'),
          ],
        },
      ])
      mockUsePositionVisibilityCheck.mockReturnValue(
        ({ poolId }: { poolId: string }) => poolId !== '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852',
      )

      const { result } = renderLsPositions()

      await waitFor(() => expect(result.current.allPositions).toHaveLength(2))
      expect(result.current.positions).toHaveLength(1)
      expect(result.current.hiddenPositions).toHaveLength(1)
      expect(result.current.hiddenPositions[0]?.poolId).toBe('0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852')
    })
  })

  describe('query enablement', () => {
    it('disables the query when account is empty', () => {
      renderLsPositions({ account: '' })

      expect(mockGetWalletPositions).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    })

    it('disables the query when disabled is true', () => {
      renderLsPositions({ disabled: true })

      expect(mockGetWalletPositions).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    })

    it('enables the query for a connected account', () => {
      renderLsPositions()

      expect(mockGetWalletPositions).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    })

    // TanStack's refetch() never consults `enabled`, so an unguarded refetch would send
    // GetWalletPositions with an empty walletAddress — which the service rejects with a 400.
    it('does not fetch when refetch is called while the account is empty', async () => {
      const { queryFnCalls } = primePages([{ positions: [] }])
      const { result } = renderLsPositions({ account: '' })

      await act(async () => {
        result.current.refetch()
      })

      expect(queryFnCalls).toEqual([])
    })

    it('fetches when refetch is called for a connected account', async () => {
      const { queryFnCalls } = primePages([{ positions: [] }])
      const { result } = renderLsPositions()

      await waitFor(() => expect(queryFnCalls.length).toBe(1))
      await act(async () => {
        result.current.refetch()
      })

      await waitFor(() => expect(queryFnCalls.length).toBe(2))
    })
  })
})
