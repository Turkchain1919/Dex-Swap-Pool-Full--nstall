import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { usePdpPool } from '~/pages/PoolDetails/components/ChartSection/usePdpPool'

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: mockUseQuery,
}))

// Pass the input through so tests can assert on the params/enabled the hook builds.
vi.mock('uniswap/src/data/apiClients/liquidityService/liquidityQueries', () => ({
  liquidityQueries: { getPool: (input: unknown): unknown => input },
}))

const TOKEN_A_ADDRESS = '0x1111111111111111111111111111111111111111'
const TOKEN_B_ADDRESS = '0x2222222222222222222222222222222222222222'

const renderPdpPool = (poolId?: string) => renderHook(() => usePdpPool({ poolId, chainId: UniverseChainId.Mainnet }))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: false })
})

describe('usePdpPool', () => {
  it('queries the liquidity GetPool by pool reference', () => {
    renderPdpPool('0xbbb')

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          pool: expect.objectContaining({ chainId: UniverseChainId.Mainnet, addressOrId: '0xbbb' }),
        }),
        enabled: true,
      }),
    )
  })

  it('normalizes the GetPool response to the canonical Pool shape', () => {
    mockUseQuery.mockReturnValue({
      data: {
        pool: {
          poolIdentifier: '0xbbb',
          chainId: UniverseChainId.Mainnet,
          protocolVersion: 2, // Protocols.V4
          token0Address: TOKEN_A_ADDRESS,
          token1Address: TOKEN_B_ADDRESS,
          feeTier: 3000,
          tvlUsd: 10,
          volumeUsd1d: 0,
          tickSpacing: 60,
          currentTick: -100,
        },
      },
      isLoading: false,
    })

    const { result } = renderPdpPool('0xbbb')

    expect(result.current.pool).toMatchObject({
      poolId: '0xbbb',
      tickSpacing: 60,
      currentTick: -100,
      isDynamicFee: false,
    })
  })

  it('normalizes a tickSpacing of 0 to undefined', () => {
    mockUseQuery.mockReturnValue({
      data: {
        pool: {
          poolIdentifier: '0xbbb',
          chainId: UniverseChainId.Mainnet,
          protocolVersion: 2, // Protocols.V4
          token0Address: TOKEN_A_ADDRESS,
          token1Address: TOKEN_B_ADDRESS,
          feeTier: 3000,
          tvlUsd: 10,
          volumeUsd1d: 0,
          tickSpacing: 0,
          currentTick: -100,
        },
      },
      isLoading: false,
    })

    const { result } = renderPdpPool('0xbbb')

    expect(result.current.pool?.tickSpacing).toBeUndefined()
  })

  it('disables the query and returns no pool without a poolId', () => {
    const { result } = renderPdpPool(undefined)

    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    expect(result.current.pool).toBeUndefined()
  })

  it('returns undefined while the GetPool response is missing', () => {
    const { result } = renderPdpPool('0xaaa')
    expect(result.current.pool).toBeUndefined()
  })
})
