import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { HookListRequest, HookListResponse } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/api_pb'
import { HookEntry, HookFlags } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { UniverseChainId } from '@universe/chains'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { V2LiquidityServiceClient } from 'uniswap/src/data/apiClients/liquidityService/LiquidityServiceClient'
import {
  buildHookRegistryMap,
  getHookRegistryKey,
  HOOK_LIST_LIMIT,
  hookRegistryQueryOptions,
  useHookRegistryMap,
} from 'uniswap/src/features/poolHooks/hooks/useHookRegistryMap'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('uniswap/src/data/apiClients/liquidityService/LiquidityServiceClient', () => ({
  V1LiquidityServiceClient: {},
  V2LiquidityServiceClient: { hookList: vi.fn() },
}))

const HOOK_BASE = new HookEntry({
  address: '0x1111111111111111111111111111111111111111',
  chain: 'Base',
  chainId: 8453,
  name: 'BaseHook',
  description: 'A hook on Base',
  verifiedSource: true,
  flags: new HookFlags({ beforeSwap: true, afterSwap: true }),
})

const HOOK_ETH = new HookEntry({
  address: '0x2222222222222222222222222222222222222222',
  chain: 'Ethereum',
  chainId: 1,
  name: 'EthHook',
  verifiedSource: false,
})

function renderRegistryHook(args?: Parameters<typeof useHookRegistryMap>[0]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  return renderHook(() => useHookRegistryMap(args), { wrapper })
}

function lastHookListRequest(): HookListRequest | undefined {
  return vi.mocked(V2LiquidityServiceClient.hookList).mock.calls.at(-1)?.[0]
}

beforeEach(() => {
  vi.mocked(V2LiquidityServiceClient.hookList).mockReset()
})

describe('getHookRegistryKey', () => {
  it('lowercases the hook address', () => {
    expect(getHookRegistryKey({ chainId: 1, hookAddress: '0xABCDEF' })).toBe('1-0xabcdef')
  })

  it('produces the same key regardless of address casing', () => {
    const lower = getHookRegistryKey({ chainId: 8453, hookAddress: HOOK_BASE.address })
    const upper = getHookRegistryKey({ chainId: 8453, hookAddress: HOOK_BASE.address.toUpperCase() })
    expect(lower).toBe(upper)
  })

  it('distinguishes the same address on different chains', () => {
    expect(getHookRegistryKey({ chainId: 1, hookAddress: HOOK_BASE.address })).not.toBe(
      getHookRegistryKey({ chainId: 8453, hookAddress: HOOK_BASE.address }),
    )
  })
})

describe('hookRegistryQueryOptions', () => {
  it('requests the full cross-chain list when no chainId is given', () => {
    const { queryKey } = hookRegistryQueryOptions()
    const params = queryKey[2] as HookListRequest

    expect(params).toBeInstanceOf(HookListRequest)
    expect(params.chainId).toBeUndefined()
    expect(params.limit).toBe(HOOK_LIST_LIMIT)
    // Independent literal, not the constant under test — lowering HOOK_LIST_LIMIT back down would
    // still fail this once it drops below the registry's known size (1969 as of LP-1685).
    expect(HOOK_LIST_LIMIT).toBeGreaterThan(1969)
  })

  it('scopes the request to a single chain when chainId is given', () => {
    const { queryKey } = hookRegistryQueryOptions({ chainId: UniverseChainId.Base })
    const params = queryKey[2] as HookListRequest

    expect(params.chainId).toBe(UniverseChainId.Base)
    // Scoping to a chain doesn't drop the truncation guard for that chain's own list.
    expect(params.limit).toBe(HOOK_LIST_LIMIT)
  })

  it('produces distinct query keys per scope so caches never mix results across chains', () => {
    const crossChain = hookRegistryQueryOptions()
    const base = hookRegistryQueryOptions({ chainId: UniverseChainId.Base })
    const mainnet = hookRegistryQueryOptions({ chainId: UniverseChainId.Mainnet })

    expect(crossChain.queryKey).not.toEqual(base.queryKey)
    expect(base.queryKey).not.toEqual(mainnet.queryKey)
  })
})

describe('useHookRegistryMap', () => {
  it('fetches only the given chain and keys the map for that chain', async () => {
    vi.mocked(V2LiquidityServiceClient.hookList).mockResolvedValue(
      new HookListResponse({ hooks: [HOOK_ETH], total: 1 }),
    )

    const { result } = renderRegistryHook({ chainId: UniverseChainId.Mainnet })

    await waitFor(() => expect(result.current).toBeDefined())
    expect(V2LiquidityServiceClient.hookList).toHaveBeenCalledTimes(1)
    expect(lastHookListRequest()).toMatchObject({ chainId: UniverseChainId.Mainnet, limit: HOOK_LIST_LIMIT })
    expect(result.current?.get(getHookRegistryKey({ chainId: 1, hookAddress: HOOK_ETH.address }))?.name).toBe('EthHook')
  })

  it('fetches the whole registry, every chain in one map, when no chainId is given', async () => {
    vi.mocked(V2LiquidityServiceClient.hookList).mockResolvedValue(
      new HookListResponse({ hooks: [HOOK_BASE, HOOK_ETH], total: 2 }),
    )

    const { result } = renderRegistryHook()

    await waitFor(() => expect(result.current).toBeDefined())
    expect(V2LiquidityServiceClient.hookList).toHaveBeenCalledTimes(1)
    expect(lastHookListRequest()?.chainId).toBeUndefined()
    expect(result.current?.get(getHookRegistryKey({ chainId: 8453, hookAddress: HOOK_BASE.address }))?.name).toBe(
      'BaseHook',
    )
    expect(result.current?.get(getHookRegistryKey({ chainId: 1, hookAddress: HOOK_ETH.address }))?.name).toBe('EthHook')
  })

  it('never issues a request while the consumer has it disabled', () => {
    const { result } = renderRegistryHook({ chainId: UniverseChainId.Mainnet, enabled: false })

    expect(result.current).toBeUndefined()
    expect(V2LiquidityServiceClient.hookList).not.toHaveBeenCalled()
  })
})

describe('buildHookRegistryMap', () => {
  it('keys each entry by chainId and lowercased address', () => {
    const map = buildHookRegistryMap(new HookListResponse({ hooks: [HOOK_BASE, HOOK_ETH] }))

    expect(map.size).toBe(2)
    expect(map.get(getHookRegistryKey({ chainId: 8453, hookAddress: HOOK_BASE.address }))?.name).toBe('BaseHook')
    expect(map.get(getHookRegistryKey({ chainId: 1, hookAddress: HOOK_ETH.address }))?.name).toBe('EthHook')
  })

  it('resolves lookups with differently-cased addresses', () => {
    const map = buildHookRegistryMap(new HookListResponse({ hooks: [HOOK_BASE] }))

    const entry = map.get(getHookRegistryKey({ chainId: 8453, hookAddress: HOOK_BASE.address.toUpperCase() }))
    expect(entry?.name).toBe('BaseHook')
  })

  it('does not match an entry on the wrong chain', () => {
    const map = buildHookRegistryMap(new HookListResponse({ hooks: [HOOK_BASE] }))

    expect(map.get(getHookRegistryKey({ chainId: 1, hookAddress: HOOK_BASE.address }))).toBeUndefined()
  })

  it('returns an empty map for an empty registry', () => {
    expect(buildHookRegistryMap(new HookListResponse({ hooks: [] })).size).toBe(0)
  })
})
