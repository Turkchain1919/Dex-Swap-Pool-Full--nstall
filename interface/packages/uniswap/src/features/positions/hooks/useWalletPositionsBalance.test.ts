import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { ChainId } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { UniverseChainId } from '@universe/chains'
import { createElement } from 'react'
import {
  type UseWalletPositionsBalanceParams,
  useWalletPositionsBalance,
} from 'uniswap/src/features/positions/hooks/useWalletPositionsBalance'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetWalletPositionsBalance, mockUseEnabledChains, mockUsePositionModifier } = vi.hoisted(() => ({
  mockGetWalletPositionsBalance: vi.fn(),
  mockUseEnabledChains: vi.fn(),
  mockUsePositionModifier: vi.fn(),
}))

vi.mock('uniswap/src/data/apiClients/liquidityService/liquidityQueries', () => ({
  liquidityQueries: { getWalletPositionsBalance: mockGetWalletPositionsBalance },
}))

vi.mock('uniswap/src/features/chains/hooks/useEnabledChains', () => ({
  useEnabledChains: mockUseEnabledChains,
}))

vi.mock('uniswap/src/features/positions/hooks/usePositionModifier', () => ({
  usePositionModifier: mockUsePositionModifier,
}))

const ACCOUNT = '0x0000000000000000000000000000000000000123'

const VISIBLE_MODIFIER = { hiddenOnly: false, poolIncludeOverrides: [], poolExcludeOverrides: [] }

/** The request the hook derives. Extra keys are the point of the first assertion, so allow them. */
type CapturedRequest = { walletAddress?: string; chainIds: ChainId[] } & Record<string, unknown>

/**
 * Captures the request the hook derives, and resolves the query with `response` — or, when given a
 * list, with each entry in turn so a later refetch can fail after an earlier fetch succeeded.
 */
function primeQuery(...responses: (unknown | Error)[]): { params: () => CapturedRequest | undefined } {
  let lastParams: CapturedRequest | undefined
  let call = 0
  mockGetWalletPositionsBalance.mockImplementation(
    ({ params, enabled }: { params: CapturedRequest; enabled?: boolean }) => {
      lastParams = params
      return {
        // Derived from the params rather than a counter: a key that changed every render would
        // restart the query forever.
        queryKey: ['test', 'getWalletPositionsBalance', JSON.stringify(params)],
        queryFn: async (): Promise<unknown> => {
          const response = responses[Math.min(call++, responses.length - 1)]
          if (response instanceof Error) {
            throw response
          }
          return response
        },
        enabled,
      }
    },
  )
  return { params: () => lastParams }
}

function renderBalance(params: UseWalletPositionsBalanceParams = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    queryClient,
    ...renderHook(() => useWalletPositionsBalance({ account: ACCOUNT, ...params }), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
    }),
  }
}

describe(useWalletPositionsBalance, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEnabledChains.mockReturnValue({ chains: [UniverseChainId.Mainnet, UniverseChainId.Base] })
    mockUsePositionModifier.mockReturnValue(VISIBLE_MODIFIER)
  })

  it('requests the wallet total: chains plus the visible-set modifier, and no version filter', () => {
    const { params } = primeQuery({ totalLiquidityUsd: 1 })

    renderBalance({ chainIds: [UniverseChainId.Base] })

    // The modifier is sent so hidden positions don't count and the header tracks the visible set.
    // `versions` stays off so a version selection can't shrink the header.
    expect(params()).toEqual({ walletAddress: ACCOUNT, chainIds: [ChainId.BASE], modifier: VISIBLE_MODIFIER })
  })

  it('defaults to the enabled EVM chains, since chain_ids is required non-empty', () => {
    const { params } = primeQuery({ totalLiquidityUsd: 1 })

    renderBalance()

    expect(params()?.chainIds).toEqual([ChainId.MAINNET, ChainId.BASE])
  })

  it('disables the query when there are no requestable chains', () => {
    primeQuery({ totalLiquidityUsd: 1 })
    mockUseEnabledChains.mockReturnValue({ chains: [] })

    renderBalance()

    expect(mockGetWalletPositionsBalance).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('settles as unknown, without widening scope, when no requested chain is a liquidity chain', () => {
    const { params } = primeQuery({ totalLiquidityUsd: 999 })

    // A chain-scoped route on a chain the liquidity service doesn't serve — Solana has no
    // `ChainId` counterpart, so `toLiquidityChainId` drops it and nothing is left to request.
    const { result } = renderBalance({ chainIds: [UniverseChainId.Solana] })

    expect(params()?.chainIds).toEqual([])
    expect(mockGetWalletPositionsBalance).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    // Not backfilled with the wallet's enabled chains: a wallet-wide figure under a header scoped to
    // one chain would be a wrong number, not a missing one.
    expect(params()?.chainIds).not.toContain(ChainId.MAINNET)
    // And it settles — no skeleton held forever, so the chip renders its deliberate `-`.
    expect(result.current.isLoading).toBe(false)
    expect(result.current.totalLiquidityUsd).toBeUndefined()
  })

  it('reports a real zero as zero', async () => {
    primeQuery({ totalLiquidityUsd: 0 })

    const { result } = renderBalance()

    await waitFor(() => expect(result.current.totalLiquidityUsd).toBe(0))
  })

  it('passes the fees total through with the same never-coerced semantics', async () => {
    primeQuery({ totalLiquidityUsd: 10, totalFeesUsd: 2.5 })

    const { result } = renderBalance()

    expect(result.current.totalFeesUsd).toBeUndefined()
    await waitFor(() => expect(result.current.totalFeesUsd).toBe(2.5))
  })

  it('leaves the total undefined on failure instead of coercing it to zero', async () => {
    primeQuery(new Error('503'))

    const { result } = renderBalance()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.totalLiquidityUsd).toBeUndefined()
  })

  it('keeps the last good total when a refetch fails, rather than reporting it unknown', async () => {
    primeQuery({ totalLiquidityUsd: 1234.5 }, new Error('503'))

    const { result, queryClient } = renderBalance()
    await waitFor(() => expect(result.current.totalLiquidityUsd).toBe(1234.5))

    await queryClient.refetchQueries()

    // The value is still correct, so consumers must keep rendering it — blanking it on a failed
    // background refresh is the mirror of the settled-$0.00 bug this hook was written for.
    expect(result.current.totalLiquidityUsd).toBe(1234.5)
  })
})
