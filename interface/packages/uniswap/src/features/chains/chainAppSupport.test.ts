import { UniverseChainId, Platform, chainIdToPlatform } from '@universe/chains'
import { AppId } from '@universe/config'
import {
  WEB_ONLY_CHAIN_SUPPORTED_APPS,
  ALL_APPS_CHAIN_SUPPORTED_APPS,
} from 'uniswap/src/features/chains/chainAppSupport'
import { ALL_CHAIN_IDS, ORDERED_CHAINS } from 'uniswap/src/features/chains/chainInfo'
import { filterChainIdsByAppSupport, getEnabledChains, isChainSupportedOnApp } from 'uniswap/src/features/chains/utils'
describe('chain app support invariants', () => {
  it('every ordered chain declares supportedApps', () => {
    for (const chain of ORDERED_CHAINS) {
      expect(chain.supportedApps.length).toBeGreaterThan(0)
    }
  })

  // Guards the decoupled chainIdToPlatform in @universe/chains (which derives platform directly
  // from the chain id) against drift from the chain-info metadata, the source of truth per chain.
  it('chainIdToPlatform matches each chain-info platform', () => {
    for (const chain of ORDERED_CHAINS) {
      expect(chainIdToPlatform(chain.id)).toBe(chain.platform)
    }
  })

  it('Solana is web-only (mobile and extension excluded)', () => {
    expect(ORDERED_CHAINS.find((chain) => chain.id === UniverseChainId.Solana)?.supportedApps).toEqual(
      WEB_ONLY_CHAIN_SUPPORTED_APPS,
    )
    expect(isChainSupportedOnApp(UniverseChainId.Solana, AppId.Web)).toBe(true)
    expect(isChainSupportedOnApp(UniverseChainId.Solana, AppId.Mobile)).toBe(false)
    expect(isChainSupportedOnApp(UniverseChainId.Solana, AppId.Extension)).toBe(false)
  })

  it('EVM chains are available on web, mobile, and extension', () => {
    for (const chain of ORDERED_CHAINS) {
      if (chain.platform !== Platform.EVM) {
        continue
      }
      expect(chain.supportedApps).toEqual(ALL_APPS_CHAIN_SUPPORTED_APPS)
    }
  })

  it('filterChainIdsByAppSupport excludes Solana on mobile and extension', () => {
    expect(filterChainIdsByAppSupport(ALL_CHAIN_IDS, AppId.Mobile)).not.toContain(UniverseChainId.Solana)
    expect(filterChainIdsByAppSupport(ALL_CHAIN_IDS, AppId.Extension)).not.toContain(UniverseChainId.Solana)
    expect(filterChainIdsByAppSupport(ALL_CHAIN_IDS, AppId.Web)).toContain(UniverseChainId.Solana)
  })

  for (const appId of [AppId.Web, AppId.Mobile, AppId.Extension]) {
    it(`getEnabledChains never returns unsupported chains on ${appId}`, () => {
      const { chains } = getEnabledChains({
        appId,
        isTestnetModeEnabled: false,
        featureFlaggedChainIds: ALL_CHAIN_IDS,
      })

      for (const chainId of chains) {
        expect(isChainSupportedOnApp(chainId, appId)).toBe(true)
      }
    })
  }

  it('getEnabledChains excludes Solana on mobile even when all rollout flags are enabled', () => {
    const { chains } = getEnabledChains({
      appId: AppId.Mobile,
      isTestnetModeEnabled: false,
      featureFlaggedChainIds: ALL_CHAIN_IDS,
    })

    expect(chains).not.toContain(UniverseChainId.Solana)
  })

  it('getEnabledChains includes Solana on web when all rollout flags are enabled', () => {
    const { chains } = getEnabledChains({
      appId: AppId.Web,
      isTestnetModeEnabled: false,
      featureFlaggedChainIds: ALL_CHAIN_IDS,
    })

    expect(chains).toContain(UniverseChainId.Solana)
  })
})
