import { isEVMChain, UniverseChainId } from '@universe/chains'
import { DynamicConfigs, LpIncentivesChainIdsConfigKey, useDynamicConfigValue } from '@universe/gating'
import { useMemo } from 'react'
import { isTestnetChain, isUniverseChainId } from 'uniswap/src/features/chains/utils'
import { isUniverseChainIdArrayType } from 'uniswap/src/features/gating/typeGuards'
import { logger } from 'utilities/src/logger/logger'
import {
  LP_INCENTIVES_CHAIN_IDS,
  LP_INCENTIVES_UNSUPPORTED_CHAIN_IDS,
} from '~/features/Liquidity/LPIncentives/constants'

function isSupportedChainId(id: number): id is UniverseChainId {
  if (!isUniverseChainId(id) || !isEVMChain(id)) {
    return false
  }

  return !isTestnetChain(id) && !LP_INCENTIVES_UNSUPPORTED_CHAIN_IDS.includes(id)
}

// The config's type guard only proves "array of numbers", so entries are checked here too. A chain
// the app doesn't know, a non-EVM one, a testnet, or one the rewards provider doesn't support is
// dropped rather than passed to a Merkl-backed read that fails the whole request over one bad
// chain. An empty or all-invalid list falls back to the default, since GetRewards rejects a request
// naming no chains at all.
export function resolveLpIncentivesChainIds(configured: number[]): UniverseChainId[] {
  const supported = configured.filter(isSupportedChainId)
  const dropped = configured.filter((id) => !isSupportedChainId(id))
  const fellBackToDefault = supported.length === 0

  // A fallback is otherwise indistinguishable from an unset config, so a typo'd chain id silently
  // narrows the read. One warn per resolve, not per entry: this config is shared across clients, and
  // a chain a given client doesn't know yet is expected rather than a misconfiguration.
  if (dropped.length > 0 || fellBackToDefault) {
    logger.warn('useLpIncentivesChainIds.ts', 'resolveLpIncentivesChainIds', 'Unusable configured chain ids', {
      configured,
      dropped,
      fellBackToDefault,
    })
  }

  return fellBackToDefault ? LP_INCENTIVES_CHAIN_IDS : supported
}

/**
 * Chains to ask GetRewards for. Rewards are distributed and claimed per chain and campaigns are no
 * longer mainnet-only, so the set is Statsig-driven (`lp_incentives_chain_ids`, overriding
 * LP_INCENTIVES_CHAIN_IDS wholesale) rather than a fixed chain — a campaign on a new chain surfaces
 * without a release. The response only carries chains the wallet actually has a balance on.
 *
 * Read by `useLpIncentiveRewards`, which claims per token per chain — so a total this widens is a
 * total Collect can settle, chain by chain.
 */
export function useLpIncentivesChainIds(): UniverseChainId[] {
  const configured = useDynamicConfigValue({
    config: DynamicConfigs.LpIncentivesChainIds,
    key: LpIncentivesChainIdsConfigKey.ChainIds,
    defaultValue: LP_INCENTIVES_CHAIN_IDS,
    customTypeGuard: isUniverseChainIdArrayType,
  })

  return useMemo(() => resolveLpIncentivesChainIds(configured), [configured])
}
