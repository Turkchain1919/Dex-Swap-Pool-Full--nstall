import { ConnectError } from '@connectrpc/connect'
import { PositionStatus as LiquidityPositionStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { UniverseChainId } from '@universe/chains'
import { useWalletPositions } from 'uniswap/src/features/positions/hooks/useWalletPositions'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import { renderHookWithProviders } from 'uniswap/src/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseLiquidityServiceWalletPositions } = vi.hoisted(() => ({
  mockUseLiquidityServiceWalletPositions: vi.fn(),
}))

// The liquidity-service source has its own suite (useLiquidityServiceWalletPositions.test.ts);
// here it is mocked so this file can assert the merge/complement logic in isolation. This
// also keeps the suite runnable against the pinned @uniswap/client-liquidity 1.3.3, which
// predates the GetWalletPositions surface the real hook imports.
vi.mock('uniswap/src/features/positions/hooks/useLiquidityServiceWalletPositions', () => ({
  useLiquidityServiceWalletPositions: mockUseLiquidityServiceWalletPositions,
}))

// Deterministic modifier shape so tests can tell the visible primary query from the hidden-only
// complement by its `hiddenOnly` flag without a seeded Redux visibility state.
vi.mock('uniswap/src/features/positions/hooks/usePositionModifier', () => ({
  usePositionModifier: ({ includeHidden }: { includeHidden: boolean }) => ({
    hiddenOnly: includeHidden,
    poolIncludeOverrides: [],
    poolExcludeOverrides: [],
  }),
}))

// ---------- Test fixtures ----------

const ACCOUNT = '0xUser'

const positionInfo = (id: string, overrides: Partial<PositionInfo> = {}): PositionInfo =>
  ({
    poolId: `pool-${id}`,
    tokenId: id,
    chainId: UniverseChainId.Mainnet,
    isHidden: false,
    ...overrides,
  }) as PositionInfo

const liquidityServiceResultFor = (
  positions: PositionInfo[],
  overrides: Record<string, unknown> = {},
): ReturnType<typeof mockUseLiquidityServiceWalletPositions> => ({
  positions,
  hiddenPositions: [],
  allPositions: positions,
  pagesLoaded: positions.length > 0 ? 1 : 0,
  isLoading: false,
  isFetching: false,
  isFetchingNextPage: false,
  isPlaceholderData: false,
  hasNextPage: false,
  hasData: true,
  error: null,
  refetch: vi.fn(),
  fetchNextPage: vi.fn().mockResolvedValue({ data: undefined }),
  ...overrides,
})

describe('useWalletPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLiquidityServiceWalletPositions.mockReturnValue(liquidityServiceResultFor([]))
  })

  describe('liquidity-service source', () => {
    it('returns the liquidity-service result as-is when no hidden complement is requested', () => {
      const lsPositions = [positionInfo('ls-1'), positionInfo('ls-2')]
      const lsResult = liquidityServiceResultFor(lsPositions)
      mockUseLiquidityServiceWalletPositions.mockReturnValue(lsResult)

      const { result } = renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT }))

      // The liquidity-service result object is returned as-is.
      expect(result.current.positions).toBe(lsPositions)
      expect(result.current.refetch).toBe(lsResult.refetch)
    })

    it('forwards account/requestStatuses/protocolVersions/pageSize defaults to the source', () => {
      renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT }))

      expect(mockUseLiquidityServiceWalletPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          account: ACCOUNT,
          protocolVersions: expect.any(Array),
          requestStatuses: expect.any(Array),
          pageSize: 25,
        }),
      )
    })

    it('forwards `disabled` to the primary query', () => {
      renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, disabled: true }))

      const primary = mockUseLiquidityServiceWalletPositions.mock.calls
        .map(([args]) => args as { modifier?: { hiddenOnly?: boolean }; disabled?: boolean })
        .find((call) => call.modifier?.hiddenOnly === false)
      expect(primary?.disabled).toBe(true)
    })
  })

  describe('hidden-complement query', () => {
    type LiquidityCallArgs = {
      modifier?: { hiddenOnly?: boolean }
      requestStatuses?: LiquidityPositionStatus[]
      disabled?: boolean
      autoFetchAllPages?: boolean
    }
    const liquidityCalls = (): LiquidityCallArgs[] =>
      mockUseLiquidityServiceWalletPositions.mock.calls.map(([args]) => args as LiquidityCallArgs)
    const primaryCall = (): LiquidityCallArgs | undefined =>
      liquidityCalls().find((call) => call.modifier?.hiddenOnly === false)
    const complementCall = (): LiquidityCallArgs | undefined =>
      liquidityCalls().find((call) => call.modifier?.hiddenOnly === true)

    it('never sends HIDDEN as a request status, even with includeHidden=true', () => {
      renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, includeHidden: true }))

      for (const call of liquidityCalls()) {
        expect(call.requestStatuses).not.toContain(LiquidityPositionStatus.HIDDEN)
        expect(call.requestStatuses).toEqual(expect.arrayContaining([LiquidityPositionStatus.OPEN]))
      }
    })

    it('includeHidden=false: complement query stays disabled', () => {
      renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT }))

      expect(complementCall()?.disabled).toBe(true)
    })

    it('includeHidden=true: complement is enabled, fully drained, and merged into hiddenPositions', () => {
      mockUseLiquidityServiceWalletPositions.mockImplementation((args: { modifier?: { hiddenOnly?: boolean } }) =>
        args.modifier?.hiddenOnly
          ? liquidityServiceResultFor([positionInfo('hid-1'), positionInfo('hid-2')])
          : liquidityServiceResultFor([positionInfo('vis-1')]),
      )

      const { result } = renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, includeHidden: true }))

      expect(primaryCall()?.disabled).toBe(false)
      expect(complementCall()?.disabled).toBe(false)
      expect(complementCall()?.autoFetchAllPages).toBe(true)
      expect(result.current.positions.map((p) => p.tokenId)).toEqual(['vis-1'])
      expect(result.current.hiddenPositions.map((p) => p.tokenId)).toEqual(['hid-1', 'hid-2'])
      expect(result.current.allPositions.map((p) => p.tokenId)).toEqual(['vis-1', 'hid-1', 'hid-2'])
    })

    it('drops the complement copy of a position the primary already returned as hidden', () => {
      mockUseLiquidityServiceWalletPositions.mockImplementation((args: { modifier?: { hiddenOnly?: boolean } }) =>
        args.modifier?.hiddenOnly
          ? liquidityServiceResultFor([positionInfo('dup'), positionInfo('hid-2')])
          : liquidityServiceResultFor([], {
              hiddenPositions: [positionInfo('dup')],
              allPositions: [positionInfo('dup')],
            }),
      )

      const { result } = renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, includeHidden: true }))

      expect(result.current.hiddenPositions.map((p) => p.tokenId)).toEqual(['dup', 'hid-2'])
      expect(result.current.allPositions.map((p) => p.tokenId)).toEqual(['dup', 'hid-2'])
    })

    it('drops the complement copy of a position the primary already returned as visible', () => {
      mockUseLiquidityServiceWalletPositions.mockImplementation((args: { modifier?: { hiddenOnly?: boolean } }) =>
        args.modifier?.hiddenOnly
          ? liquidityServiceResultFor([positionInfo('dup')])
          : liquidityServiceResultFor([positionInfo('dup')]),
      )

      const { result } = renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, includeHidden: true }))

      expect(result.current.positions.map((p) => p.tokenId)).toEqual(['dup'])
      expect(result.current.hiddenPositions).toEqual([])
      expect(result.current.allPositions.map((p) => p.tokenId)).toEqual(['dup'])
    })

    it('sorts the merged hidden section by USD value descending', () => {
      mockUseLiquidityServiceWalletPositions.mockImplementation((args: { modifier?: { hiddenOnly?: boolean } }) =>
        args.modifier?.hiddenOnly
          ? liquidityServiceResultFor([
              positionInfo('hid-low', { totalValueUsd: 1 }),
              positionInfo('hid-high', { totalValueUsd: 10 }),
            ])
          : liquidityServiceResultFor([], {
              hiddenPositions: [positionInfo('hid-mid', { totalValueUsd: 5 })],
              allPositions: [positionInfo('hid-mid', { totalValueUsd: 5 })],
            }),
      )

      const { result } = renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, includeHidden: true }))

      expect(result.current.hiddenPositions.map((p) => p.tokenId)).toEqual(['hid-high', 'hid-mid', 'hid-low'])
    })

    it('surfaces the complement first-load and error state once the primary has settled', () => {
      const complementError = new ConnectError('hidden fetch failed')
      mockUseLiquidityServiceWalletPositions.mockImplementation((args: { modifier?: { hiddenOnly?: boolean } }) =>
        args.modifier?.hiddenOnly
          ? liquidityServiceResultFor([], { error: complementError, isLoading: true, isFetching: true })
          : liquidityServiceResultFor([positionInfo('vis-1')]),
      )

      const { result } = renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, includeHidden: true }))

      expect(result.current.error).toBe(complementError)
      expect(result.current.isLoading).toBe(true)
      // Pagination semantics stay primary-only: the complement's drain must not pin isFetching.
      expect(result.current.isFetching).toBe(false)
      expect(result.current.isFetchingNextPage).toBe(false)
    })

    it('defers the complement error while the primary is still unsettled', () => {
      mockUseLiquidityServiceWalletPositions.mockImplementation((args: { modifier?: { hiddenOnly?: boolean } }) =>
        args.modifier?.hiddenOnly
          ? liquidityServiceResultFor([], { error: new ConnectError('hidden failed') })
          : liquidityServiceResultFor([], { hasData: false, isLoading: true, isFetching: true }),
      )

      const { result } = renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, includeHidden: true }))

      // A secondary failure must not blank a still-loading primary via `!!error && !hasData`.
      expect(result.current.error).toBeNull()
      expect(result.current.hasData).toBe(false)
    })

    it('primary error wins over the complement error', () => {
      const primaryError = new ConnectError('primary failed')
      mockUseLiquidityServiceWalletPositions.mockImplementation((args: { modifier?: { hiddenOnly?: boolean } }) =>
        args.modifier?.hiddenOnly
          ? liquidityServiceResultFor([], { error: new ConnectError('hidden failed') })
          : liquidityServiceResultFor([], { error: primaryError }),
      )

      const { result } = renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, includeHidden: true }))

      expect(result.current.error).toBe(primaryError)
    })

    it('merged refetch refetches both the primary and the complement query', () => {
      const primaryRefetch = vi.fn()
      const complementRefetch = vi.fn()
      mockUseLiquidityServiceWalletPositions.mockImplementation((args: { modifier?: { hiddenOnly?: boolean } }) =>
        args.modifier?.hiddenOnly
          ? liquidityServiceResultFor([], { refetch: complementRefetch })
          : liquidityServiceResultFor([], { refetch: primaryRefetch }),
      )

      const { result } = renderHookWithProviders(() => useWalletPositions({ account: ACCOUNT, includeHidden: true }))
      result.current.refetch()

      expect(primaryRefetch).toHaveBeenCalledTimes(1)
      expect(complementRefetch).toHaveBeenCalledTimes(1)
    })

    it('explicit liquidityModifier: passed through unchanged and the complement never runs', () => {
      const explicitModifier = { includeSpamTokens: true }

      renderHookWithProviders(() =>
        useWalletPositions({ account: ACCOUNT, includeHidden: true, liquidityModifier: explicitModifier }),
      )

      const explicitCall = liquidityCalls().find((call) => call.modifier === explicitModifier)
      expect(explicitCall?.disabled).toBe(false)
      expect(complementCall()?.disabled).toBe(true)
    })
  })
})
