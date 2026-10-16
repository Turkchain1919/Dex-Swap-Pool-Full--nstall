import { useMemo } from 'react'
import { getRestMultichainTokenEntry } from 'uniswap/src/components/MultichainTokenDetails/getMultichainTokenEntry'
import {
  type MultichainTokenEntry,
  useOrderedMultichainEntries,
} from 'uniswap/src/components/MultichainTokenDetails/useOrderedMultichainEntries'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import type { MultiChainMap } from '~/pages/TokenDetails/context/TDPContext'

/** Maps TDP `multiChainMap` to ordered multichain entries (same ordering as balances / address dropdown). */
export function useMultichainTokenEntries(multiChainMap: MultiChainMap): MultichainTokenEntry[] {
  // includeTestnets keeps the set testnet-mode-independent: mainnet deployments must not
  // drop out of the multichain UI when testnet mode is on.
  const { chains: enabledChainIds } = useEnabledChains({ includeTestnets: true })
  const entries = useMemo(() => {
    const result: MultichainTokenEntry[] = []
    for (const [chainIdKey, data] of Object.entries(multiChainMap)) {
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- biome-parity: oxlint is stricter here
      if (!data) {
        continue
      }

      const entry = getRestMultichainTokenEntry({ chainIdKey, address: data.address ?? '' }, enabledChainIds)
      if (entry) {
        result.push(entry)
      }
    }
    return result
  }, [multiChainMap, enabledChainIds])
  return useOrderedMultichainEntries(entries)
}
