import { getLauncherAddresses, isLaunchSupportedChain, selectTokenFactory } from '@uniswap/liquidity-launcher-sdk'
import { UniverseChainId } from '@universe/chains'
import { FeatureFlags, useFeatureFlag } from '@universe/gating'
import { useMemo } from 'react'
import { ORDERED_EVM_CHAINS } from 'uniswap/src/features/chains/chainInfo'

/**
 * Chains whose launcher stack is deployed (present in the SDK) but that must not be surfaced on
 * web prod for this release. Hidden here at the single derivation point so every launcher surface
 * (network pickers, create flow, explore gating) stays consistent.
 */
const HIDDEN_LAUNCH_CHAINS: UniverseChainId[] = [UniverseChainId.XLayer]

const launchSupportedChains: UniverseChainId[] = ORDERED_EVM_CHAINS.map((chain) => chain.id).filter(
  (id) => isLaunchSupportedChain(id) && !HIDDEN_LAUNCH_CHAINS.includes(id),
)

/**
 * Chains where the CCA launcher stack is live: the SDK's supported set intersected with the app's
 * registered EVM chains (SDK chains the app doesn't register, e.g. Base Sepolia, stay invisible).
 * The SDK is the single source of truth — enabling a chain here is a @uniswap/liquidity-launcher-sdk
 * version bump, not a code change. Mainnet is pinned first: the network pickers default to the
 * list's head, and that default must not drift with upstream chain ordering.
 *
 * Deliberately not exported: surfaces must read {@link useToucanAuctionSupportedChains} so the
 * chain rollout flags below always apply.
 */
const TOUCAN_AUCTION_SUPPORTED_CHAINS: UniverseChainId[] = [
  ...launchSupportedChains.filter((id) => id === UniverseChainId.Mainnet),
  ...launchSupportedChains.filter((id) => id !== UniverseChainId.Mainnet),
]

/**
 * Chains featured as newly launched in the create-auction flow: pinned directly under Mainnet in
 * the flow's network pickers and badged "New". Flow-local — the app-wide network selector is
 * unaffected. Remove a chain here once it no longer needs featured placement.
 */
export const NEW_LAUNCH_CHAINS: UniverseChainId[] = [UniverseChainId.Robinhood]

/**
 * Subset of {@link TOUCAN_AUCTION_SUPPORTED_CHAINS} where a brand-new token can be created: chains
 * whose launcher stack registers a token factory. Factory-less chains support auctions of
 * pre-existing tokens only.
 *
 * Deliberately not exported: surfaces must read {@link useToucanTokenCreationSupportedChains} so
 * the chain rollout flags below always apply.
 */
const TOUCAN_TOKEN_CREATION_SUPPORTED_CHAINS: UniverseChainId[] = TOUCAN_AUCTION_SUPPORTED_CHAINS.filter((id) => {
  const addresses = getLauncherAddresses(id)
  return addresses !== undefined && selectTokenFactory(addresses) !== undefined
})

/**
 * Launch chains whose rollout is owned by the app-wide chain flag that gates the rest of their
 * support, so one flag switches the chain on everywhere. Applied in a hook rather than at the
 * module-scope derivation above because the flags are only readable from React.
 */
function useChainsHiddenByRolloutFlag(): UniverseChainId[] {
  const isArcEnabled = useFeatureFlag(FeatureFlags.Arc)
  return useMemo(() => (isArcEnabled ? [] : [UniverseChainId.Arc]), [isArcEnabled])
}

/** The auction-supported launch chains, minus chains whose rollout flag is still off. */
export function useToucanAuctionSupportedChains(): UniverseChainId[] {
  const hiddenChains = useChainsHiddenByRolloutFlag()
  return useMemo(() => TOUCAN_AUCTION_SUPPORTED_CHAINS.filter((id) => !hiddenChains.includes(id)), [hiddenChains])
}

/** The token-creation-supported launch chains, minus chains whose rollout flag is still off. */
export function useToucanTokenCreationSupportedChains(): UniverseChainId[] {
  const hiddenChains = useChainsHiddenByRolloutFlag()
  return useMemo(
    () => TOUCAN_TOKEN_CREATION_SUPPORTED_CHAINS.filter((id) => !hiddenChains.includes(id)),
    [hiddenChains],
  )
}
