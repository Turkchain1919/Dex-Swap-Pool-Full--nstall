import { UniverseChainId } from '@universe/chains'
import { useStatsigClientStatus } from '@universe/gating'
import { useEffect } from 'react'
import { useCreateAuctionStoreActions } from '~/pages/Liquidity/CreateAuction/CreateAuctionContext'

/**
 * Keeps the create-new-token selected network in sync with the allowed networks. When testnet mode
 * toggles, the allowed list is re-partitioned (see `filterAllowedNetworksByTestnetMode`), which can
 * leave the stored selection (e.g. the default Unichain) pointing at a chain that's no longer
 * offered. This snaps it back to the first allowed chain so the picker, its trigger label, and the
 * submitted auction all agree on a valid network.
 */
export function useReconcileCreateNewTokenNetwork({
  selectedNetwork,
  allowedNetworks,
}: {
  selectedNetwork: UniverseChainId
  allowedNetworks: UniverseChainId[]
}): void {
  const { updateCreateNewTokenField } = useCreateAuctionStoreActions()
  const { isStatsigReady } = useStatsigClientStatus()

  useEffect(() => {
    // Absent is not disallowed. While readiness is unreported the chain rollout flags read as
    // their default (false), so a flag-gated launch chain (Arc) is transiently missing from
    // `allowedNetworks` — on first load, and again whenever `updateUserAsync` re-enters `Loading`
    // mid-session (wallet connect). Snapping against that partial list would drop a chain the user
    // picked for the rest of the session: nothing re-selects it once the flag reads true again.
    if (!isStatsigReady || allowedNetworks.length === 0) {
      return
    }

    if (!allowedNetworks.includes(selectedNetwork)) {
      updateCreateNewTokenField('network', allowedNetworks[0])
    }
  }, [allowedNetworks, isStatsigReady, selectedNetwork, updateCreateNewTokenField])
}
