import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Protocols } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { PoolSummary, PoolTick } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { FeeAmount, TICK_SPACINGS } from '@uniswap/v3-sdk'
import { Pool as V4Pool } from '@uniswap/v4-sdk'
import { UniverseChainId } from '@universe/chains'
import { PropsWithChildren } from 'react'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { V2_DEFAULT_FEE_TIER } from 'uniswap/src/constants/pools'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePoolActiveLiquidity } from '~/features/Liquidity/hooks/usePoolTickData'
import { buildV2SyntheticPool, V2_SYNTHETIC_TICK_SPACING } from '~/features/Liquidity/utils/v2SyntheticTicks'
import { TEST_TOKEN_1, TEST_TOKEN_2 } from '~/test-utils/constants'

const POOL_ID = '0xabc0000000000000000000000000000000000000000000000000000000000001'
const V3_POOL_ADDRESS = '0x0000000000000000000000000000000000000abc'
const V2_PAIR_ADDRESS = '0x0000000000000000000000000000000000000def'

// Static fee tier the UI asks for. The pool's live (protocol) fee differs, which is why the pool's
// own tick spacing must win over the fee-tier default.
const STATIC_FEE_TIER = FeeAmount.MEDIUM
// Deliberately not TICK_SPACINGS[MEDIUM] (60), so a tick spacing of 60 can only have come from
// the fee-tier fallback and never from the pool row.
const TICK_SPACING = 10
const FEE_TIER_DEFAULT_TICK_SPACING = 60
const CURRENT_TICK = 130

// Pool + tick reads both go through the liquidity-service client; the hook reads nothing else.
const liquidityServiceState = vi.hoisted(() => ({
  getPool: vi.fn(),
  getPoolTicks: vi.fn(),
}))

vi.mock('uniswap/src/data/apiClients/liquidityService/LiquidityServiceClient', () => ({
  V1LiquidityServiceClient: {},
  V2LiquidityServiceClient: {
    getPool: liquidityServiceState.getPool,
    getPoolTicks: liquidityServiceState.getPoolTicks,
  },
}))

// chainId is always passed explicitly below, so the ambient default is unused.
vi.mock('~/state/multichain/useMultichainContext', () => ({
  useMultichainContext: () => ({ chainId: undefined, isMultichainContext: false }),
}))

const tickRows = [
  { tick: 0, liquidityNet: '1000' },
  { tick: 60, liquidityNet: '2000' },
  { tick: 120, liquidityNet: '3000' },
  { tick: 180, liquidityNet: '-2000' },
  { tick: 240, liquidityNet: '-1000' },
]

// A liquidity-service `GetPool` `PoolSummary` for the pool under test.
function lsPool(overrides: Partial<ConstructorParameters<typeof PoolSummary>[0]> = {}): PoolSummary {
  return new PoolSummary({
    poolIdentifier: POOL_ID,
    chainId: UniverseChainId.Mainnet,
    protocolVersion: Protocols.V4,
    token0Address: TEST_TOKEN_1.address,
    token1Address: TEST_TOKEN_2.address,
    // Live protocol fee, deliberately different from STATIC_FEE_TIER.
    feeTier: 100,
    tickSpacing: TICK_SPACING,
    currentTick: CURRENT_TICK,
    sqrtPriceX96: '79228162514264337593543950336',
    liquidity: '5000000',
    ...overrides,
  })
}

function lsTicks(): { ticks: PoolTick[] } {
  return {
    ticks: tickRows.map(
      (t) =>
        new PoolTick({
          tickIdx: t.tick,
          liquidityNet: t.liquidityNet,
          priceToken0InToken1: 1,
          priceToken1InToken0: 1,
        }),
    ),
  }
}

const sdkCurrencies = { TOKEN0: TEST_TOKEN_1, TOKEN1: TEST_TOKEN_2 }

// A fresh client per test: no retry backoff on failures, and no result cached across cases.
function renderPoolActiveLiquidity(args: Parameters<typeof usePoolActiveLiquidity>[0]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => usePoolActiveLiquidity(args), { wrapper })
}

describe('usePoolActiveLiquidity', () => {
  beforeEach(() => {
    liquidityServiceState.getPool.mockReset()
    liquidityServiceState.getPoolTicks.mockReset()
    liquidityServiceState.getPool.mockResolvedValue({ pool: undefined })
    liquidityServiceState.getPoolTicks.mockResolvedValue({ ticks: [] })
  })

  it("keeps a v4 pool's own tick spacing even when its live fee differs from the requested fee tier", async () => {
    liquidityServiceState.getPool.mockResolvedValue({ pool: lsPool() })
    liquidityServiceState.getPoolTicks.mockResolvedValue(lsTicks())

    const { result } = renderPoolActiveLiquidity({
      sdkCurrencies,
      feeAmount: STATIC_FEE_TIER,
      version: ProtocolVersion.V4,
      chainId: UniverseChainId.Mainnet,
      poolId: POOL_ID,
    })

    // currentTick can only come from the pool row, so this gates on the pool actually resolving.
    await waitFor(() => expect(result.current.currentTick).toBe(CURRENT_TICK), { timeout: 5000 })

    expect(result.current.tickSpacing).toBe(TICK_SPACING)
    expect(result.current.activeTick).toBe(130)
    expect(result.current.liquidity?.toString()).toBe('5000000')
    expect(result.current.data?.length).toBeGreaterThan(0)

    // GetPool is keyed on the pool id.
    expect(liquidityServiceState.getPool).toHaveBeenCalledWith(
      expect.objectContaining({ pool: expect.objectContaining({ addressOrId: POOL_ID }) }),
    )
  })

  it('resolves tick data for a v3 pool addressed by pool address', async () => {
    liquidityServiceState.getPool.mockResolvedValue({
      pool: lsPool({ poolIdentifier: V3_POOL_ADDRESS, protocolVersion: Protocols.V3, feeTier: STATIC_FEE_TIER }),
    })
    liquidityServiceState.getPoolTicks.mockResolvedValue(lsTicks())

    const { result } = renderPoolActiveLiquidity({
      sdkCurrencies,
      feeAmount: STATIC_FEE_TIER,
      version: ProtocolVersion.V3,
      chainId: UniverseChainId.Mainnet,
      poolId: V3_POOL_ADDRESS,
    })

    await waitFor(() => expect(result.current.currentTick).toBe(CURRENT_TICK), { timeout: 5000 })

    expect(result.current.tickSpacing).toBe(TICK_SPACING)
    expect(result.current.activeTick).toBe(130)
    expect(result.current.data?.length).toBeGreaterThan(0)
    expect(liquidityServiceState.getPool).toHaveBeenCalledWith(
      expect.objectContaining({ pool: expect.objectContaining({ addressOrId: V3_POOL_ADDRESS }) }),
    )
  })

  it('derives the pool id from a create-flow tickSpacing when no pool id is known', async () => {
    const expectedPoolId = V4Pool.getPoolId(TEST_TOKEN_1, TEST_TOKEN_2, STATIC_FEE_TIER, TICK_SPACING, ZERO_ADDRESS)
    liquidityServiceState.getPool.mockResolvedValue({ pool: lsPool() })
    liquidityServiceState.getPoolTicks.mockResolvedValue(lsTicks())

    const { result } = renderPoolActiveLiquidity({
      sdkCurrencies,
      feeAmount: STATIC_FEE_TIER,
      version: ProtocolVersion.V4,
      chainId: UniverseChainId.Mainnet,
      // Create flow supplies tickSpacing from form state and has no pool id yet.
      tickSpacing: TICK_SPACING,
      hooks: ZERO_ADDRESS,
    })

    await waitFor(() => expect(result.current.currentTick).toBe(CURRENT_TICK), { timeout: 5000 })

    expect(result.current.tickSpacing).toBe(TICK_SPACING)
    expect(result.current.activeTick).toBe(130)
    expect(liquidityServiceState.getPool).toHaveBeenCalledWith(
      expect.objectContaining({ pool: expect.objectContaining({ addressOrId: expectedPoolId }) }),
    )
  })

  it('derives the pool id from the fee tier when no tickSpacing is known (create flow)', async () => {
    const expectedPoolId = V4Pool.getPoolId(
      TEST_TOKEN_1,
      TEST_TOKEN_2,
      STATIC_FEE_TIER,
      TICK_SPACINGS[STATIC_FEE_TIER],
      ZERO_ADDRESS,
    )

    liquidityServiceState.getPool.mockResolvedValue({
      pool: lsPool({
        poolIdentifier: expectedPoolId,
        feeTier: STATIC_FEE_TIER,
        tickSpacing: FEE_TIER_DEFAULT_TICK_SPACING,
      }),
    })
    liquidityServiceState.getPoolTicks.mockResolvedValue(lsTicks())

    const { result } = renderPoolActiveLiquidity({
      sdkCurrencies,
      feeAmount: STATIC_FEE_TIER,
      version: ProtocolVersion.V4,
      chainId: UniverseChainId.Mainnet,
      // Create flow: no pool id and no tickSpacing yet, only fee + hooks.
      hooks: ZERO_ADDRESS,
    })

    await waitFor(() => expect(result.current.currentTick).toBe(CURRENT_TICK), { timeout: 5000 })

    expect(result.current.activeTick).toBe(120)
    expect(result.current.data?.length).toBeGreaterThan(0)
    expect(liquidityServiceState.getPool).toHaveBeenCalledWith(
      expect.objectContaining({ pool: expect.objectContaining({ addressOrId: expectedPoolId }) }),
    )
  })

  it('synthesizes a full-range distribution for a v2 pool from its reserves alone', async () => {
    // No pool row exists for v2 in the liquidity service; the reserves are the only input.
    const { result } = renderPoolActiveLiquidity({
      sdkCurrencies,
      feeAmount: V2_DEFAULT_FEE_TIER,
      version: ProtocolVersion.V2,
      chainId: UniverseChainId.Mainnet,
      poolId: V2_PAIR_ADDRESS,
      v2Reserves: { reserve0: 1000, reserve1: 2000 },
    })

    await waitFor(() => expect(result.current.data?.length).toBeGreaterThan(0), { timeout: 5000 })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeUndefined()
    expect(result.current.tickSpacing).toBe(V2_SYNTHETIC_TICK_SPACING)
    expect(result.current.currentTick).toBe(6931)
    expect(result.current.activeTick).toBe(6900)
    expect(result.current.liquidity?.toString()).toBe('1414213562373095048801')

    // Uniform L across every bucket, and the active bucket is present so the depth chart can anchor.
    const liquidities = new Set(result.current.data?.map((t) => t.liquidityActive.toString()))
    expect(liquidities.size).toBe(1)
    expect(result.current.data?.some((t) => t.tick === result.current.activeTick)).toBe(true)
  })

  it('resolves one tick spacing for both v2 chart paths, whatever the fee tier says', async () => {
    // The Liquidity chart (`D3LiquidityPoolChart`) builds its own pool without passing a tick
    // spacing, so the `buildV2SyntheticPool` default governs it.
    const liquidityChartSpacing = buildV2SyntheticPool({
      reserves: { reserve0: 1000, reserve1: 2000 },
      token0: TEST_TOKEN_1,
      token1: TEST_TOKEN_2,
    })?.tickSpacing

    // LOWEST maps to TICK_SPACINGS = 1, deliberately unequal to V2_SYNTHETIC_TICK_SPACING: if the
    // V3/V4 fee-tier fallback leaked into the v2 path it would surface as a wrong spacing here
    // rather than coincidentally matching, the way the real 0.30% tier's 60 would.
    const { result } = renderPoolActiveLiquidity({
      sdkCurrencies,
      feeAmount: FeeAmount.LOWEST,
      version: ProtocolVersion.V2,
      chainId: UniverseChainId.Mainnet,
      poolId: V2_PAIR_ADDRESS,
      v2Reserves: { reserve0: 1000, reserve1: 2000 },
    })

    await waitFor(() => expect(result.current.data?.length).toBeGreaterThan(0), { timeout: 5000 })

    // This hook feeds the Depth chart; the build above feeds the Liquidity chart. Both must follow
    // the one constant, so editing it moves both charts together or fails here.
    expect(result.current.tickSpacing).toBe(V2_SYNTHETIC_TICK_SPACING)
    expect(liquidityChartSpacing).toBe(V2_SYNTHETIC_TICK_SPACING)
    expect(result.current.tickSpacing).toBe(liquidityChartSpacing)
  })

  it('settles with no data for a v2 pool whose reserves are unavailable', async () => {
    const { result } = renderPoolActiveLiquidity({
      sdkCurrencies,
      feeAmount: V2_DEFAULT_FEE_TIER,
      version: ProtocolVersion.V2,
      chainId: UniverseChainId.Mainnet,
      poolId: V2_PAIR_ADDRESS,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 })
    expect(result.current.data).toBeUndefined()
  })

  it('treats an absent (zero) tick_spacing as missing and falls back to the fee tier default', async () => {
    // proto3 non-optional int32: an unset tick_spacing arrives as 0.
    liquidityServiceState.getPool.mockResolvedValue({ pool: lsPool({ tickSpacing: 0 }) })
    liquidityServiceState.getPoolTicks.mockResolvedValue(lsTicks())

    const { result } = renderPoolActiveLiquidity({
      sdkCurrencies,
      feeAmount: STATIC_FEE_TIER,
      version: ProtocolVersion.V4,
      chainId: UniverseChainId.Mainnet,
      poolId: POOL_ID,
    })

    await waitFor(() => expect(result.current.currentTick).toBe(CURRENT_TICK), { timeout: 5000 })

    expect(result.current.tickSpacing).toBe(FEE_TIER_DEFAULT_TICK_SPACING)
    expect(result.current.activeTick).toBe(120)
  })
})
