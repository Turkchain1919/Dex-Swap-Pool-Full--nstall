import { useQuery } from '@tanstack/react-query'
import { HookListRequest, HookListResponse } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/api_pb'
import type { HookEntry } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { AddressStringFormat, normalizeAddress, type UniverseChainId } from '@universe/chains'
import { liquidityQueries } from 'uniswap/src/data/apiClients/liquidityService/liquidityQueries'

// The hooks registry (Uniswap/hooklist) is a curated list (~1969 entries as of LP-1685), so an
// unscoped fetch asks for well above its total size to keep server-side pagination from truncating
// it. Chain-scoped fetches are further bounded by that chain's own, much smaller, list.
export const HOOK_LIST_LIMIT = 5000

// Fetched lazily by the first consumer that mounts (staleTime/gcTime Infinity), then kept for the
// session so subsequent registry reads for the same scope are synchronous cache hits.
//
// Hooks are chain-specific: pass `chainId` whenever the caller knows which chain it is looking at
// (the add flow, a chain-filtered pools table) so only that chain's list is fetched. Omit it only
// for a genuinely cross-chain surface (the all-networks explore table), which needs the full registry.
export function hookRegistryQueryOptions({ chainId }: { chainId?: UniverseChainId } = {}): ReturnType<
  typeof liquidityQueries.hookList
> {
  return liquidityQueries.hookList({
    // HookListRequest's chain_id is a plain wire int32 (no UniverseChainId at the proto level) — cast
    // at this boundary rather than loosening the exported chainId type back to `number`.
    params: new HookListRequest({ chainId: chainId as number | undefined, limit: HOOK_LIST_LIMIT }),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function getHookRegistryKey({ chainId, hookAddress }: { chainId: number; hookAddress: string }): string {
  return `${chainId}-${normalizeAddress(hookAddress, AddressStringFormat.Lowercase)}`
}

export function buildHookRegistryMap(data: HookListResponse): Map<string, HookEntry> {
  const map = new Map<string, HookEntry>()
  for (const hook of data.hooks) {
    map.set(getHookRegistryKey({ chainId: hook.chainId, hookAddress: hook.address }), hook)
  }
  return map
}

/**
 * Known v4 hooks keyed by `getHookRegistryKey` (chainId + lowercased hook address) for O(1) lookups —
 * every chain's when `chainId` is omitted, one chain's when it is given. Undefined until the registry
 * has loaded — callers should fall back to showing the raw hook address.
 *
 * Pass `enabled: false` to defer the fetch until the consumer actually needs it (e.g. until the
 * chain it will look up on is known).
 */
export function useHookRegistryMap({ chainId, enabled = true }: { chainId?: UniverseChainId; enabled?: boolean } = {}):
  | Map<string, HookEntry>
  | undefined {
  const { data } = useQuery({ ...hookRegistryQueryOptions({ chainId }), select: buildHookRegistryMap, enabled })
  return data
}
