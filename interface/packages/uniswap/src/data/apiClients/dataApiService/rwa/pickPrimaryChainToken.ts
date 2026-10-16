import { UniverseChainId } from '@universe/chains'
import type { ChainToken } from 'uniswap/src/data/apiClients/dataApiService/rwa/types'

/** First chain token on an enabled chain. Callers pass chainTokens already sorted mainnet-first (see the RWA
 *  mappers), so this resolves to the mainnet-preferred enabled chain. */
export function pickPrimaryChainToken(
  chainTokens: ChainToken[],
  enabledChainIds: readonly UniverseChainId[],
): ChainToken | undefined {
  const enabled = new Set(enabledChainIds)
  return chainTokens.find((chainToken) => enabled.has(chainToken.chainId as UniverseChainId))
}

export function pickFilteredChainToken({
  chainTokens,
  enabledChainIds,
  chainFilter,
}: {
  chainTokens: ChainToken[]
  enabledChainIds: readonly UniverseChainId[]
  chainFilter?: UniverseChainId
}): ChainToken | undefined {
  return chainFilter && enabledChainIds.includes(chainFilter)
    ? chainTokens.find((chainToken) => chainToken.chainId === chainFilter)
    : undefined
}

// chainTokens carries every deployment (mainnet-first) even on chain-scoped requests, so a filtered surface must
// pick the filtered leg itself.
export function pickDisplayChainToken({
  chainTokens,
  enabledChainIds,
  chainFilter,
}: {
  chainTokens: ChainToken[]
  enabledChainIds: readonly UniverseChainId[]
  chainFilter?: UniverseChainId
}): ChainToken | undefined {
  return (
    pickFilteredChainToken({ chainTokens, enabledChainIds, chainFilter }) ??
    pickPrimaryChainToken(chainTokens, enabledChainIds)
  )
}
