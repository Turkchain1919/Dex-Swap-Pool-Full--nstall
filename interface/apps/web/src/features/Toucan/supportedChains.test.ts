import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { FeatureFlags, useFeatureFlag } from '@universe/gating'
import { describe, expect, it, vi } from 'vitest'
import {
  useToucanAuctionSupportedChains,
  useToucanTokenCreationSupportedChains,
} from '~/features/Toucan/supportedChains'
import { mocked } from '~/test-utils/mocked'

// The launcher registry is mocked so the rollout gate is tested against a registry that carries
// Arc: the gate is a property of these hooks, not of whichever SDK version is pinned, and the
// pinned SDK has no Arc yet. Chain ids are literals because vi.mock's factory is hoisted above
// this file's imports — the flag-off expectation below fails loudly if any of them is wrong.
vi.mock('@uniswap/liquidity-launcher-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@uniswap/liquidity-launcher-sdk')>()
  // Mainnet, Base, Arc, XLayer.
  const registry = [1, 8453, 5042, 196]
  return {
    ...actual,
    isLaunchSupportedChain: (chainId: number) => registry.includes(chainId),
    getLauncherAddresses: (chainId: number) =>
      registry.includes(chainId) ? { uerc20Factory: '0x0000000000000000000000000000000000000001' } : undefined,
    selectTokenFactory: (addresses: { uerc20Factory?: string }) => addresses.uerc20Factory,
  }
})

function enableArcFlag(): void {
  mocked(useFeatureFlag).mockImplementation((flag) => flag === FeatureFlags.Arc)
}

function renderBothLists(): { auction: UniverseChainId[]; creation: UniverseChainId[] } {
  return {
    auction: renderHook(() => useToucanAuctionSupportedChains()).result.current,
    creation: renderHook(() => useToucanTokenCreationSupportedChains()).result.current,
  }
}

describe('Toucan launcher chain rollout gating', () => {
  // Runs before the flag-off cases on purpose: a flag implementation leaking across tests would
  // surface as a failure below rather than passing silently.
  it('surfaces Arc on both lists once FeatureFlags.Arc is on', () => {
    enableArcFlag()
    const { auction, creation } = renderBothLists()
    expect(auction).toContain(UniverseChainId.Arc)
    expect(creation).toContain(UniverseChainId.Arc)
  })

  it('hides Arc from both lists while FeatureFlags.Arc is off', () => {
    const { auction, creation } = renderBothLists()
    expect(new Set(auction)).toEqual(new Set([UniverseChainId.Mainnet, UniverseChainId.Base]))
    expect(new Set(creation)).toEqual(new Set([UniverseChainId.Mainnet, UniverseChainId.Base]))
  })

  it('keeps XLayer hidden whether the Arc flag is on or off', () => {
    expect(renderBothLists().auction).not.toContain(UniverseChainId.XLayer)
    enableArcFlag()
    expect(renderBothLists().auction).not.toContain(UniverseChainId.XLayer)
  })

  it('changes nothing but Arc when the flag turns on', () => {
    const withFlagOff = renderBothLists().auction
    enableArcFlag()
    const withFlagOn = renderBothLists().auction
    expect(withFlagOn.filter((id) => id !== UniverseChainId.Arc)).toEqual(withFlagOff)
  })

  it('keeps Mainnet at the head of both lists', () => {
    enableArcFlag()
    const { auction, creation } = renderBothLists()
    expect(auction[0]).toBe(UniverseChainId.Mainnet)
    expect(creation[0]).toBe(UniverseChainId.Mainnet)
  })
})
