import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { useLiquidityServicePoolData } from '~/data/pools/useLiquidityServicePoolData'

const { mockUseQuery, mockParsePool } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockParsePool: vi.fn(),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: mockUseQuery,
}))

// Pass the input through so tests can assert on the params/enabled the hook builds.
vi.mock('uniswap/src/data/apiClients/liquidityService/liquidityQueries', () => ({
  liquidityQueries: { getPool: (input: unknown): unknown => input },
}))

vi.mock('uniswap/src/features/chains/hooks/useEnabledChains', () => ({
  useEnabledChains: (): { defaultChainId: UniverseChainId } => ({ defaultChainId: UniverseChainId.Mainnet }),
}))

// Mapping is covered by parseLiquidityServicePool.test.ts; stubbed here to isolate query wiring.
vi.mock('~/data/pools/parseLiquidityServicePool', () => ({
  parseLiquidityServicePool: mockParsePool,
}))

const POOL_ADDRESS = '0x1111111111111111111111111111111111111111'

/** The `{ params, enabled }` input the hook handed to `liquidityQueries.getPool`. */
function capturedQueryInput(): { params: { pool?: { chainId: number; addressOrId: string } }; enabled: boolean } {
  return mockUseQuery.mock.calls[0][0]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: undefined })
})

describe('useLiquidityServicePoolData', () => {
  it('requests the pool by chain id and address', () => {
    renderHook(() => useLiquidityServicePoolData({ poolIdOrAddress: POOL_ADDRESS, chainId: UniverseChainId.Base }))

    const { params, enabled } = capturedQueryInput()
    expect(enabled).toBe(true)
    expect(params.pool).toEqual({ chainId: UniverseChainId.Base, addressOrId: POOL_ADDRESS })
  })

  it('falls back to the default chain when none is given', () => {
    renderHook(() => useLiquidityServicePoolData({ poolIdOrAddress: POOL_ADDRESS }))

    expect(capturedQueryInput().params.pool?.chainId).toBe(UniverseChainId.Mainnet)
  })

  it('does not query when disabled by the caller', () => {
    renderHook(() =>
      useLiquidityServicePoolData({ poolIdOrAddress: POOL_ADDRESS, chainId: UniverseChainId.Base, disabled: true }),
    )

    expect(capturedQueryInput().enabled).toBe(false)
  })

  it('does not query for an SVM chain, whose id has no liquidity ChainId enum value', () => {
    renderHook(() => useLiquidityServicePoolData({ poolIdOrAddress: POOL_ADDRESS, chainId: UniverseChainId.Solana }))

    expect(capturedQueryInput().enabled).toBe(false)
  })

  it('parses the served pool against the resolved chain', () => {
    const pool = { poolIdentifier: POOL_ADDRESS }
    const parsed = { idOrAddress: POOL_ADDRESS }
    mockUseQuery.mockReturnValue({ data: { pool }, isLoading: false, error: undefined })
    mockParsePool.mockReturnValue(parsed)

    const { result } = renderHook(() =>
      useLiquidityServicePoolData({ poolIdOrAddress: POOL_ADDRESS, chainId: UniverseChainId.Base }),
    )

    expect(mockParsePool).toHaveBeenCalledWith(pool, UniverseChainId.Base)
    expect(result.current).toEqual({ data: parsed, loading: false, error: false })
  })

  it('reports an error without data when the request fails', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom') })

    const { result } = renderHook(() =>
      useLiquidityServicePoolData({ poolIdOrAddress: POOL_ADDRESS, chainId: UniverseChainId.Base }),
    )

    expect(result.current).toEqual({ data: undefined, loading: false, error: true })
  })
})
