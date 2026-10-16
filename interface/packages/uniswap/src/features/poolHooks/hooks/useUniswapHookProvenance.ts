import { areEvmAddressesEqual } from '@universe/chains'
import { DynamicConfigs, UniswapBuiltHookAddressesConfigKey, useDynamicConfigValue } from '@universe/gating'
import { useCallback } from 'react'
import type { AppTFunction } from 'utilities/src/i18n/types'

/** One entry of the `uniswap_built_hook_addresses` config: a hook identified by its chain and address. */
export interface UniswapHookAddress {
  chainId: number
  address: string
}

/** Uniswap Labs' relationship to a hook: it wrote the hook's code, configured its deployment, or both. */
export enum UniswapHookProvenance {
  Built = 'built',
  Configured = 'configured',
  BuiltAndConfigured = 'builtAndConfigured',
}

interface HookTarget {
  chainId: number | undefined
  address: string | undefined
}

/** Narrows one unknown Statsig payload entry to a well-formed {@link UniswapHookAddress}. */
function isUniswapHookAddressEntry(value: unknown): value is UniswapHookAddress {
  return (
    typeof value === 'object' &&
    value !== null &&
    'chainId' in value &&
    typeof value.chainId === 'number' &&
    'address' in value &&
    typeof value.address === 'string'
  )
}

function isUniswapHookAddressList(value: unknown): value is readonly UniswapHookAddress[] {
  return Array.isArray(value) && value.every(isUniswapHookAddressEntry)
}

// Shared default so an unpopulated list is referentially stable across renders and doesn't churn the
// memoized lookup below.
const NO_HOOKS: readonly UniswapHookAddress[] = []

/**
 * One of the three `{ chainId, address }[]` lists in the `uniswap_built_hook_addresses` Statsig config.
 * A malformed list (not an array, or an entry missing `chainId`/`address`) reads as empty rather than
 * throwing while the hook picker renders.
 */
function useUniswapHookAddressList(key: UniswapBuiltHookAddressesConfigKey): readonly UniswapHookAddress[] {
  return useDynamicConfigValue({
    config: DynamicConfigs.UniswapBuiltHookAddresses,
    key,
    defaultValue: NO_HOOKS,
    customTypeGuard: isUniswapHookAddressList,
  })
}

// Exhaustiveness guard for the copy switches below: a new provenance fails to compile here rather than
// silently rendering another variant's wording.
function assertNever(value: never): never {
  throw new Error(`Unexpected hook provenance: ${JSON.stringify(value)}`)
}

function includesHook(hooks: readonly UniswapHookAddress[], target: HookTarget): boolean {
  return hooks.some((hook) => hook.chainId === target.chainId && areEvmAddressesEqual(hook.address, target.address))
}

/**
 * Returns a lookup from a hook (by chain + address) to Uniswap Labs' provenance for it, or `undefined`
 * for a hook Uniswap neither built nor configured. The hooks correspond to entries the backend hook
 * registry (Uniswap/hooklist) already returns — a registry hook matching one (same chain and address)
 * is badged; all of its display data (name, description, flags) still comes from the registry.
 *
 * There's no in-code default: the sets come entirely from the `uniswap_built_hook_addresses` Statsig
 * config (`built`, `configured` and `both` lists), so they can change without a deploy and nothing is
 * badged until the config is populated. A hook listed under both `built` and `configured` reads as
 * built-and-configured even when the config didn't file it under `both`, so a split entry can't demote
 * the badge.
 */
export function useUniswapHookProvenance(): (hook: HookTarget) => UniswapHookProvenance | undefined {
  const built = useUniswapHookAddressList(UniswapBuiltHookAddressesConfigKey.Built)
  const configured = useUniswapHookAddressList(UniswapBuiltHookAddressesConfigKey.Configured)
  const both = useUniswapHookAddressList(UniswapBuiltHookAddressesConfigKey.Both)

  return useCallback(
    (target: HookTarget): UniswapHookProvenance | undefined => {
      const isBuilt = includesHook(built, target)
      const isConfigured = includesHook(configured, target)
      if (includesHook(both, target) || (isBuilt && isConfigured)) {
        return UniswapHookProvenance.BuiltAndConfigured
      }
      if (isBuilt) {
        return UniswapHookProvenance.Built
      }
      if (isConfigured) {
        return UniswapHookProvenance.Configured
      }
      return undefined
    },
    [built, configured, both],
  )
}

/**
 * The badge copy for a provenance. Every surface that names Uniswap's relationship to a hook (picker
 * row, details dialog, table and badge tooltips) renders this, so the wording can't drift between them.
 */
export function getUniswapHookProvenanceLabel({
  provenance,
  t,
}: {
  provenance: UniswapHookProvenance
  t: AppTFunction
}): string {
  switch (provenance) {
    case UniswapHookProvenance.Built:
      return t('hook.builtByUniswap')
    case UniswapHookProvenance.Configured:
      return t('hook.configuredByUniswap')
    case UniswapHookProvenance.BuiltAndConfigured:
      return t('hook.builtAndConfiguredByUniswap')
    default:
      return assertNever(provenance)
  }
}

/**
 * The one-line explanation in the badge's hover tooltip. Kept beside the label so the two are authored
 * as a pair and stay in step when the wording changes.
 */
export function getUniswapHookProvenanceDescription({
  provenance,
  t,
}: {
  provenance: UniswapHookProvenance
  t: AppTFunction
}): string {
  switch (provenance) {
    case UniswapHookProvenance.Built:
      return t('hook.builtByUniswap.description')
    case UniswapHookProvenance.Configured:
      return t('hook.configuredByUniswap.description')
    case UniswapHookProvenance.BuiltAndConfigured:
      return t('hook.builtAndConfiguredByUniswap.description')
    default:
      return assertNever(provenance)
  }
}
