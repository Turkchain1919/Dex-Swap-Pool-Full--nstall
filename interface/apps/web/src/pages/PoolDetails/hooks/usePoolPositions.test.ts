import { renderHook } from '@testing-library/react'
import { PositionStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { UniverseChainId } from '@universe/chains'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import { usePoolPositions } from '~/pages/PoolDetails/hooks/usePoolPositions'

const { mockUseLiquidityServiceWalletPositions } = vi.hoisted(() => ({
  mockUseLiquidityServiceWalletPositions: vi.fn(),
}))

vi.mock('uniswap/src/features/positions/hooks/useLiquidityServiceWalletPositions', () => ({
  useLiquidityServiceWalletPositions: mockUseLiquidityServiceWalletPositions,
}))

const ACCOUNT = '0xUser'
const POOL_ID = '0xAbCdEf0000000000000000000000000000000001'

const positionInfo = (poolId: string): PositionInfo => ({ poolId, chainId: UniverseChainId.Mainnet }) as PositionInfo

const liquidityResult = (
  allPositions: PositionInfo[] = [],
): { allPositions: PositionInfo[]; isPlaceholderData: boolean } => ({
  allPositions,
  isPlaceholderData: false,
})

const renderPoolPositions = (
  overrides: Partial<Parameters<typeof usePoolPositions>[0]> = {},
): ReturnType<typeof renderHook<ReturnType<typeof usePoolPositions>, unknown>> =>
  renderHook(() =>
    usePoolPositions({
      account: ACCOUNT,
      chainId: UniverseChainId.Mainnet,
      poolIdOrAddress: POOL_ID,
      ...overrides,
    }),
  )

const requestArgs = (): Record<string, unknown> =>
  mockUseLiquidityServiceWalletPositions.mock.calls.at(-1)?.[0] as Record<string, unknown>

describe('usePoolPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLiquidityServiceWalletPositions.mockReturnValue(liquidityResult())
  })

  it('scopes the request to the pool and its chain', () => {
    renderPoolPositions()

    expect(requestArgs()).toEqual(
      expect.objectContaining({
        account: ACCOUNT,
        chainIds: [UniverseChainId.Mainnet],
        search: POOL_ID,
        requestStatuses: [PositionStatus.OPEN, PositionStatus.CLOSED],
        disabled: false,
      }),
    )
    // No modifier: spam-flagged pools stay excluded server-side, and the user's portfolio hides are
    // deliberately not sent, so a hidden position still shows on its own pool's page.
    expect(requestArgs().modifier).toBeUndefined()
  })

  it('keeps only exact pool matches, ignoring case', () => {
    const inPool = positionInfo(POOL_ID.toLowerCase())
    mockUseLiquidityServiceWalletPositions.mockReturnValue(
      // `search` is a substring filter, so an unrelated pool can come back with the match.
      liquidityResult([inPool, positionInfo('0xSomeOtherPool')]),
    )

    const { result } = renderPoolPositions()

    expect(result.current.positions).toEqual([inPool])
  })

  it('skips the query without a connected account', () => {
    renderPoolPositions({ account: undefined })

    expect(requestArgs().disabled).toBe(true)
  })

  it('skips the query on a chain the liquidity service does not serve', () => {
    renderPoolPositions({ chainId: UniverseChainId.Solana })

    expect(requestArgs().disabled).toBe(true)
  })
})
