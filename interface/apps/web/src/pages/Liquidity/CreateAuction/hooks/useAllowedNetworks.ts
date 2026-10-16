import { UniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { isTestnetChain } from 'uniswap/src/features/chains/utils'
import {
  NEW_LAUNCH_CHAINS,
  useToucanAuctionSupportedChains,
  useToucanTokenCreationSupportedChains,
} from '~/features/Toucan/supportedChains'

const VALID_CHAIN_IDS = new Set<UniverseChainId>(
  Object.values(UniverseChainId).filter((value): value is UniverseChainId => typeof value === 'number'),
)

/**
 * Filters a list of allowed network ids down to those that match the current testnet mode: only
 * testnet chains when testnet mode is enabled, only mainnet chains otherwise. Ids that aren't valid
 * UniverseChainIds are dropped. Mirrors the testnet partitioning that `getEnabledChains` applies to
 * the globally enabled chains, so the auction network pickers stay consistent with the rest of the app.
 */
export function filterAllowedNetworksByTestnetMode({
  allowedNetworkIds,
  isTestnetModeEnabled,
}: {
  allowedNetworkIds: UniverseChainId[]
  isTestnetModeEnabled: boolean
}): UniverseChainId[] {
  return allowedNetworkIds.filter(
    (id): id is UniverseChainId => VALID_CHAIN_IDS.has(id) && isTestnetChain(id) === isTestnetModeEnabled,
  )
}

/**
 * Pins {@link NEW_LAUNCH_CHAINS} directly under Mainnet so newly launched chains get featured
 * placement in the create-auction network pickers. Mainnet stays first — the pickers default to
 * the head of the list.
 */
export function pinNewLaunchChains(allowedNetworkIds: UniverseChainId[]): UniverseChainId[] {
  const isNewLaunchChain = (id: UniverseChainId): boolean =>
    id !== UniverseChainId.Mainnet && NEW_LAUNCH_CHAINS.includes(id)
  return [
    ...allowedNetworkIds.filter((id) => id === UniverseChainId.Mainnet),
    ...allowedNetworkIds.filter(isNewLaunchChain),
    ...allowedNetworkIds.filter((id) => id !== UniverseChainId.Mainnet && !isNewLaunchChain(id)),
  ]
}

function useAllowedNetworks(allowedNetworkIds: UniverseChainId[]): UniverseChainId[] {
  const { isTestnetModeEnabled } = useEnabledChains()

  return useMemo(
    () => pinNewLaunchChains(filterAllowedNetworksByTestnetMode({ allowedNetworkIds, isTestnetModeEnabled })),
    [allowedNetworkIds, isTestnetModeEnabled],
  )
}

/** Networks available when creating a brand-new token to auction (chains whose stack has a token factory). */
export function useCreateNewTokenAllowedNetworks(): UniverseChainId[] {
  const tokenCreationChains = useToucanTokenCreationSupportedChains()
  return useAllowedNetworks(tokenCreationChains)
}

/** Networks available when auctioning an existing token. */
export function useCreateAuctionAllowedNetworks(): UniverseChainId[] {
  const auctionChains = useToucanAuctionSupportedChains()
  return useAllowedNetworks(auctionChains)
}
