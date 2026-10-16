import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { useStatsigClientStatus } from '@universe/gating'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReconcileCreateNewTokenNetwork } from '~/pages/Liquidity/CreateAuction/hooks/useReconcileCreateNewTokenNetwork'
import { CreateAuctionStoreContext } from '~/pages/Liquidity/CreateAuction/store/CreateAuctionStoreContext'
import {
  type CreateAuctionStore,
  createCreateAuctionStore,
} from '~/pages/Liquidity/CreateAuction/store/createCreateAuctionStore'
import { TokenMode } from '~/pages/Liquidity/CreateAuction/types'
import { mocked } from '~/test-utils/mocked'

// Replaces — does not layer onto — the global `@universe/gating` mock in setupTests, which hardcodes
// `isStatsigReady: true` and so can't be driven per test. `importOriginal` restores the real module,
// so the eighteen other exports setupTests stubs (`useFeatureFlag`, `useDynamicConfigValue`, ...) are
// the real implementations here. Nothing in this suite reads them; anything flag-reading added to it
// needs its own stub in the factory below.
vi.mock('@universe/gating', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('@universe/gating')>()),
    useStatsigClientStatus: vi.fn(),
  }
})

const useStatsigClientStatusMock = mocked(useStatsigClientStatus)

function setStatsigReady(isStatsigReady: boolean): void {
  useStatsigClientStatusMock.mockReturnValue({
    isStatsigReady,
    isStatsigLoading: !isStatsigReady,
    isStatsigUninitialized: !isStatsigReady,
  })
}

type ReconcileArgs = { selectedNetwork: UniverseChainId; allowedNetworks: UniverseChainId[] }

function renderReconcile(
  store: CreateAuctionStore,
  args: ReconcileArgs,
): { rerender: (nextArgs: ReconcileArgs) => void } {
  const { rerender } = renderHook((props: ReconcileArgs) => useReconcileCreateNewTokenNetwork(props), {
    initialProps: args,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(CreateAuctionStoreContext.Provider, { value: store }, children),
  })
  return { rerender }
}

function selectedNetworkOf(store: CreateAuctionStore): UniverseChainId | undefined {
  const { tokenForm } = store.getState()
  return tokenForm.mode === TokenMode.CREATE_NEW ? tokenForm.network : undefined
}

beforeEach(() => {
  setStatsigReady(true)
})

describe('useReconcileCreateNewTokenNetwork', () => {
  it('snaps the selected network to the first allowed chain when it is no longer allowed', () => {
    const store = createCreateAuctionStore()
    store.getState().actions.updateCreateNewTokenField('network', UniverseChainId.Unichain)

    renderReconcile(store, { selectedNetwork: UniverseChainId.Unichain, allowedNetworks: [UniverseChainId.Sepolia] })

    expect(selectedNetworkOf(store)).toBe(UniverseChainId.Sepolia)
  })

  it('leaves the selected network untouched when it is still allowed', () => {
    const store = createCreateAuctionStore()
    store.getState().actions.updateCreateNewTokenField('network', UniverseChainId.Unichain)

    renderReconcile(store, {
      selectedNetwork: UniverseChainId.Unichain,
      allowedNetworks: [UniverseChainId.Mainnet, UniverseChainId.Unichain, UniverseChainId.Base],
    })

    expect(selectedNetworkOf(store)).toBe(UniverseChainId.Unichain)
  })

  it('leaves the selected network untouched when no networks are allowed', () => {
    const store = createCreateAuctionStore()
    store.getState().actions.updateCreateNewTokenField('network', UniverseChainId.Unichain)

    renderReconcile(store, { selectedNetwork: UniverseChainId.Unichain, allowedNetworks: [] })

    expect(selectedNetworkOf(store)).toBe(UniverseChainId.Unichain)
  })

  it('keeps a selection that the rollout flags have not resolved yet, and still has it once they do', () => {
    setStatsigReady(false)
    const store = createCreateAuctionStore()
    // Stands in for the network picker's `onSelect`: the only way a session comes to hold Arc.
    store.getState().actions.updateCreateNewTokenField('network', UniverseChainId.Arc)

    // While readiness is unreported the Arc rollout flag reads false, so Arc drops out of the
    // allowed list. Readiness regresses mid-session too (`updateUserAsync` on wallet connect),
    // which is when a picked chain is live enough to lose.
    const { rerender } = renderReconcile(store, {
      selectedNetwork: UniverseChainId.Arc,
      allowedNetworks: [UniverseChainId.Mainnet, UniverseChainId.Unichain],
    })

    expect(selectedNetworkOf(store)).toBe(UniverseChainId.Arc)

    setStatsigReady(true)
    rerender({
      selectedNetwork: UniverseChainId.Arc,
      allowedNetworks: [UniverseChainId.Mainnet, UniverseChainId.Arc, UniverseChainId.Unichain],
    })

    expect(selectedNetworkOf(store)).toBe(UniverseChainId.Arc)
  })
})
