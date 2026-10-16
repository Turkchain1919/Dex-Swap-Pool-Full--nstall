import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Currency } from '@uniswap/sdk-core'
import { AddressStringFormat, normalizeAddress } from '@universe/chains'
import { useMemo } from 'react'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { useAllFeeTierPoolData } from '~/features/Liquidity/hooks/useAllFeeTierPoolData'
import { FeeTierData } from '~/types/liquidity'

/**
 * The indexed pool with the most TVL among a pair's fee tiers. Tiers that are `created` only per the
 * on-chain check carry no id — and no indexed history to borrow — so they don't qualify. `excludePoolId`
 * drops the pool doing the borrowing, so a pool with liquidity only outside the current tick can't be
 * handed back its own id.
 */
export function getDeepestCreatedPoolId(
  feeTierData: Record<string, FeeTierData>,
  excludePoolId?: string,
): string | undefined {
  // A v3 pool id is the pool's address, which one source can checksum and another not, so ids are
  // compared case-insensitively.
  const excluded = excludePoolId && normalizeAddress(excludePoolId, AddressStringFormat.Lowercase)
  let deepest: FeeTierData | undefined
  for (const tier of Object.values(feeTierData)) {
    if (!tier.created || !tier.id || normalizeAddress(tier.id, AddressStringFormat.Lowercase) === excluded) {
      continue
    }
    if (!deepest || tier.totalLiquidityUsd > deepest.totalLiquidityUsd) {
      deepest = tier
    }
  }
  return deepest?.id
}

/**
 * The deepest existing pool for a pair at any fee tier, for a pool with no price line of its own to
 * borrow history from — one that is still being created, or one that is initialized but holds no
 * liquidity. The pair trades at one market price regardless of which pool it's in, so any sibling's
 * history is the same backdrop.
 *
 * Pools with the new pool's own hook come first (the tiers the fee-tier selector lists as created).
 * A hooked pool with no such siblings falls back to the pair's hookless pools, since arbitrage keeps
 * their price aligned with the hooked one; the fallback is only consulted once the same-hook lookup
 * has settled empty, and never for a hookless pool, where it would just repeat the first lookup.
 */
export function useSiblingPoolId({
  chainId,
  protocolVersion,
  sdkCurrencies,
  hook,
  excludePoolId,
  skip,
}: {
  chainId?: number
  protocolVersion: ProtocolVersion
  sdkCurrencies: { TOKEN0: Maybe<Currency>; TOKEN1: Maybe<Currency> }
  /** The new pool's hook; `ZERO_ADDRESS` for a hookless pool. */
  hook: string
  /** The borrowing pool's own id, when it has one, so it isn't returned as its own sibling. */
  excludePoolId?: string
  skip?: boolean
}): { siblingPoolId: string | undefined; isLoading: boolean } {
  const sameHook = useAllFeeTierPoolData({ chainId, protocolVersion, sdkCurrencies, hook, skip })
  const sameHookPoolId = useMemo(
    () => getDeepestCreatedPoolId(sameHook.feeTierData, excludePoolId),
    [sameHook.feeTierData, excludePoolId],
  )
  // useAllFeeTierPoolData keeps `isLoading` set on a failed read so the fee-tier UI fails closed. A chart
  // has nothing to gate: a failed lookup means "no sibling" and has to settle, or the fallback below and
  // the inputs-only view could never take over from the loading skeleton.
  const sameHookLoading = sameHook.isLoading && !sameHook.isError

  const isHooked = hook.toLowerCase() !== ZERO_ADDRESS
  const useHooklessFallback = isHooked && !sameHookLoading && sameHookPoolId === undefined
  const hookless = useAllFeeTierPoolData({
    chainId,
    protocolVersion,
    sdkCurrencies,
    hook: ZERO_ADDRESS,
    skip: skip || !useHooklessFallback,
  })
  const hooklessPoolId = useMemo(
    () => getDeepestCreatedPoolId(hookless.feeTierData, excludePoolId),
    [hookless.feeTierData, excludePoolId],
  )
  const hooklessLoading = hookless.isLoading && !hookless.isError

  return {
    siblingPoolId: sameHookPoolId ?? (useHooklessFallback ? hooklessPoolId : undefined),
    isLoading: sameHookLoading || (useHooklessFallback && hooklessLoading),
  }
}
