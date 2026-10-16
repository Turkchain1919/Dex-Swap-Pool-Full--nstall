import { renderHook } from '@testing-library/react'
import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Percent } from '@uniswap/sdk-core'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAllFeeTierPoolData } from '~/features/Liquidity/hooks/useAllFeeTierPoolData'
import { getDeepestCreatedPoolId, useSiblingPoolId } from '~/features/Liquidity/hooks/useSiblingPoolId'
import { TEST_TOKEN_1, TEST_TOKEN_2 } from '~/test-utils/constants'
import { FeeTierData } from '~/types/liquidity'

vi.mock('~/features/Liquidity/hooks/useAllFeeTierPoolData', () => ({
  useAllFeeTierPoolData: vi.fn(),
}))

const mockedUseAllFeeTierPoolData = vi.mocked(useAllFeeTierPoolData)

function tier({
  id,
  created,
  totalLiquidityUsd,
}: {
  id?: string
  created: boolean
  totalLiquidityUsd: number
}): FeeTierData {
  return {
    id,
    fee: { feeAmount: 3000, tickSpacing: 60, isDynamic: false },
    formattedFee: '0.30%',
    totalLiquidityUsd,
    percentage: new Percent(0, 100),
    tvl: String(totalLiquidityUsd),
    created,
  }
}

describe('getDeepestCreatedPoolId', () => {
  it('picks the created tier with the most TVL', () => {
    const feeTierData = {
      '500-10': tier({ id: 'shallow', created: true, totalLiquidityUsd: 1_000 }),
      '3000-60': tier({ id: 'deep', created: true, totalLiquidityUsd: 5_000_000 }),
      '10000-200': tier({ id: 'mid', created: true, totalLiquidityUsd: 20_000 }),
    }
    expect(getDeepestCreatedPoolId(feeTierData)).toBe('deep')
  })

  it('ignores default tiers that have no pool and on-chain-only tiers that have no id', () => {
    const feeTierData = {
      // A merged default: no pool behind it.
      '100-1': tier({ created: false, totalLiquidityUsd: 0 }),
      // Marked created by the on-chain check only, so nothing indexed to borrow history from.
      '500-10': tier({ created: true, totalLiquidityUsd: 0 }),
      '3000-60': tier({ id: 'indexed', created: true, totalLiquidityUsd: 0 }),
    }
    expect(getDeepestCreatedPoolId(feeTierData)).toBe('indexed')
  })

  it('returns undefined when the pair has no indexed pool', () => {
    expect(getDeepestCreatedPoolId({ '3000-60': tier({ created: false, totalLiquidityUsd: 0 }) })).toBeUndefined()
    expect(getDeepestCreatedPoolId({})).toBeUndefined()
  })

  it('never hands the borrowing pool back its own id', () => {
    const feeTierData = {
      '500-10': tier({ id: '0xSELF', created: true, totalLiquidityUsd: 5_000_000 }),
      '3000-60': tier({ id: 'other', created: true, totalLiquidityUsd: 1_000 }),
    }
    // Pool ids come from different sources, so compare them case-insensitively.
    expect(getDeepestCreatedPoolId(feeTierData, '0xself')).toBe('other')
    expect(getDeepestCreatedPoolId({ '500-10': feeTierData['500-10'] }, '0xSELF')).toBeUndefined()
    expect(getDeepestCreatedPoolId(feeTierData)).toBe('0xSELF')
  })
})

describe('useSiblingPoolId', () => {
  const HOOK = '0x00000000000000000000000000000000000000ab'
  const BASE_ARGS = {
    chainId: 1,
    protocolVersion: ProtocolVersion.V4,
    sdkCurrencies: { TOKEN0: TEST_TOKEN_1, TOKEN1: TEST_TOKEN_2 },
  }

  // One lookup result per hook filter. A skipped lookup only ever holds the uncreated default tiers,
  // and never reports loading or an error, which is what the real hook does. An errored lookup keeps
  // `isLoading` set alongside `isError`, mirroring the real hook's fail-closed loading state.
  function mockLookups(byHook: Record<string, { poolId?: string; isLoading?: boolean; isError?: boolean }>) {
    mockedUseAllFeeTierPoolData.mockImplementation(({ hook, skip }) => {
      const entry = byHook[hook] ?? {}
      const feeTierData: Record<string, FeeTierData> =
        !skip && entry.poolId ? { '3000-60': tier({ id: entry.poolId, created: true, totalLiquidityUsd: 1 }) } : {}
      const isError = !skip && Boolean(entry.isError)
      return {
        feeTierData,
        hasExistingFeeTiers: Object.keys(feeTierData).length > 0,
        isLoading: !skip && (Boolean(entry.isLoading) || isError),
        isError,
      }
    })
  }

  function lookupsFor(hook: string) {
    return mockedUseAllFeeTierPoolData.mock.calls.map(([args]) => args).filter((args) => args.hook === hook)
  }

  beforeEach(() => {
    mockedUseAllFeeTierPoolData.mockReset()
  })

  it('returns the deepest hookless sibling for a hookless pool without a second lookup', () => {
    mockLookups({ [ZERO_ADDRESS]: { poolId: 'hookless-deep' } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: ZERO_ADDRESS }))

    expect(result.current).toEqual({ siblingPoolId: 'hookless-deep', isLoading: false })
    // The fallback would repeat the same query, so it stays skipped.
    const [primary, fallback] = lookupsFor(ZERO_ADDRESS)
    expect(primary).toEqual(
      expect.objectContaining({ chainId: 1, protocolVersion: ProtocolVersion.V4, skip: undefined }),
    )
    expect(fallback).toEqual(expect.objectContaining({ skip: true }))
  })

  it('prefers a sibling with the same hook and leaves the hookless lookup skipped', () => {
    mockLookups({ [HOOK]: { poolId: 'hooked-sibling' }, [ZERO_ADDRESS]: { poolId: 'hookless-deep' } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: HOOK }))

    expect(result.current).toEqual({ siblingPoolId: 'hooked-sibling', isLoading: false })
    expect(lookupsFor(ZERO_ADDRESS).every((args) => args.skip === true)).toBe(true)
  })

  it('falls back to the hookless pools when a hooked pool has no same-hook siblings', () => {
    mockLookups({ [HOOK]: {}, [ZERO_ADDRESS]: { poolId: 'hookless-deep' } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: HOOK }))

    expect(result.current).toEqual({ siblingPoolId: 'hookless-deep', isLoading: false })
    expect(lookupsFor(ZERO_ADDRESS).at(-1)).toEqual(expect.objectContaining({ hook: ZERO_ADDRESS, skip: false }))
  })

  it('does not consult the hookless pools while the same-hook lookup is still loading', () => {
    mockLookups({ [HOOK]: { isLoading: true }, [ZERO_ADDRESS]: { poolId: 'hookless-deep' } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: HOOK }))

    expect(result.current).toEqual({ siblingPoolId: undefined, isLoading: true })
    expect(lookupsFor(ZERO_ADDRESS).every((args) => args.skip === true)).toBe(true)
  })

  it('reports loading while the hookless fallback is fetching', () => {
    mockLookups({ [HOOK]: {}, [ZERO_ADDRESS]: { isLoading: true } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: HOOK }))

    expect(result.current).toEqual({ siblingPoolId: undefined, isLoading: true })
  })

  it('settles as "no sibling" when the same-hook lookup errors instead of loading forever', () => {
    mockLookups({ [ZERO_ADDRESS]: { isError: true } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: ZERO_ADDRESS }))

    // The real hook keeps isLoading set on an error (fail closed for the fee-tier UI); the chart must not.
    expect(result.current).toEqual({ siblingPoolId: undefined, isLoading: false })
  })

  it('still falls back to the hookless pools when the same-hook lookup errors', () => {
    mockLookups({ [HOOK]: { isError: true }, [ZERO_ADDRESS]: { poolId: 'hookless-deep' } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: HOOK }))

    expect(result.current).toEqual({ siblingPoolId: 'hookless-deep', isLoading: false })
  })

  it('settles when the hookless fallback errors too', () => {
    mockLookups({ [HOOK]: {}, [ZERO_ADDRESS]: { isError: true } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: HOOK }))

    expect(result.current).toEqual({ siblingPoolId: undefined, isLoading: false })
  })

  it('excludes the borrowing pool from both lookups', () => {
    mockLookups({ [HOOK]: { poolId: 'self' }, [ZERO_ADDRESS]: { poolId: 'hookless-deep' } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: HOOK, excludePoolId: 'self' }))

    // The only same-hook candidate is the pool itself, so the hookless fallback takes over.
    expect(result.current).toEqual({ siblingPoolId: 'hookless-deep', isLoading: false })
  })

  it('passes skip through to both lookups so an existing pool never triggers them', () => {
    mockLookups({ [HOOK]: { poolId: 'hooked-sibling' }, [ZERO_ADDRESS]: { poolId: 'hookless-deep' } })

    const { result } = renderHook(() => useSiblingPoolId({ ...BASE_ARGS, hook: HOOK, skip: true }))

    expect(result.current).toEqual({ siblingPoolId: undefined, isLoading: false })
    expect(mockedUseAllFeeTierPoolData.mock.calls.every(([args]) => args.skip === true)).toBe(true)
  })
})
