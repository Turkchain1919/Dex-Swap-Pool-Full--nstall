import { act, renderHook } from '@testing-library/react'
import { FeatureFlags, useFeatureFlag } from '@universe/gating'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation, useNavigationType } from 'react-router'
import { describe, expect, it } from 'vitest'
import {
  AuctionQuickFilter,
  ExploreTablesFilterStoreContextProvider,
  useExploreTablesFilterStore,
  useExploreTablesFilterStoreActions,
} from '~/features/Explore/state/exploreTablesFilterStore'
import {
  auctionQuickFilterFromParam,
  useSyncAuctionQuickFilterParam,
} from '~/pages/Explore/hooks/useAuctionQuickFilterParam'
import { mocked } from '~/test-utils/mocked'

describe('auctionQuickFilterFromParam', () => {
  it('parses known filter values', () => {
    expect(auctionQuickFilterFromParam('verified')).toBe(AuctionQuickFilter.Verified)
    expect(auctionQuickFilterFromParam('new')).toBe(AuctionQuickFilter.New)
    expect(auctionQuickFilterFromParam('active')).toBe(AuctionQuickFilter.Active)
    expect(auctionQuickFilterFromParam('completed')).toBe(AuctionQuickFilter.Completed)
  })

  it('accepts quick_launch regardless of gate state so an unresolved flag cannot erase deep links', () => {
    expect(auctionQuickFilterFromParam('quick_launch')).toBe(AuctionQuickFilter.QuickLaunch)
  })

  it('returns undefined for missing, unknown, or default values', () => {
    expect(auctionQuickFilterFromParam(null)).toBeUndefined()
    expect(auctionQuickFilterFromParam('garbage')).toBeUndefined()
    expect(auctionQuickFilterFromParam('all')).toBeUndefined()
  })
})

function createWrapper({
  initialEntry,
  initialQuickFilter,
}: {
  initialEntry: string
  initialQuickFilter?: AuctionQuickFilter
}) {
  return function Wrapper({ children }: PropsWithChildren): JSX.Element {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <ExploreTablesFilterStoreContextProvider initialQuickFilter={initialQuickFilter}>
          {children}
        </ExploreTablesFilterStoreContextProvider>
      </MemoryRouter>
    )
  }
}

function useTestHarness() {
  useSyncAuctionQuickFilterParam()
  const { search } = useLocation()
  return {
    params: new URLSearchParams(search),
    navigationType: useNavigationType(),
    quickFilter: useExploreTablesFilterStore((state) => state.quickFilter),
    actions: useExploreTablesFilterStoreActions(),
  }
}

describe('useSyncAuctionQuickFilterParam', () => {
  it('adopts a valid ?filter= value into the store at mount', () => {
    const { result } = renderHook(useTestHarness, {
      wrapper: createWrapper({ initialEntry: '/explore/auctions?filter=verified' }),
    })

    expect(result.current.quickFilter).toBe(AuctionQuickFilter.Verified)
    expect(result.current.params.get('filter')).toBe('verified')
  })

  it('mirrors a filter change into the URL via history replace', () => {
    const { result } = renderHook(useTestHarness, {
      wrapper: createWrapper({ initialEntry: '/explore/auctions' }),
    })

    act(() => {
      result.current.actions.setQuickFilter(AuctionQuickFilter.New)
    })

    expect(result.current.params.get('filter')).toBe('new')
    expect(result.current.navigationType).toBe('REPLACE')
  })

  it('deletes the param when All is selected, leaving unrelated params intact', () => {
    const { result } = renderHook(useTestHarness, {
      wrapper: createWrapper({ initialEntry: '/explore/auctions?category=stocks&filter=verified' }),
    })
    expect(result.current.quickFilter).toBe(AuctionQuickFilter.Verified)

    act(() => {
      result.current.actions.setQuickFilter(AuctionQuickFilter.All)
    })

    expect(result.current.params.get('filter')).toBeNull()
    expect(result.current.params.get('category')).toBe('stocks')
  })

  it('resets a quick_launch selection to All once statsig is ready with the gate off', () => {
    // useFeatureFlag is mocked false by default and useStatsigClientStatus is mocked ready.
    const { result } = renderHook(useTestHarness, {
      wrapper: createWrapper({ initialEntry: '/explore/auctions?filter=quick_launch' }),
    })

    expect(result.current.quickFilter).toBe(AuctionQuickFilter.All)
    expect(result.current.params.get('filter')).toBeNull()
  })

  it('keeps a quick_launch deep link when the gate is on', () => {
    mocked(useFeatureFlag).mockImplementation((flag) => flag === FeatureFlags.QuickLaunch)

    const { result } = renderHook(useTestHarness, {
      wrapper: createWrapper({ initialEntry: '/explore/auctions?filter=quick_launch' }),
    })

    expect(result.current.quickFilter).toBe(AuctionQuickFilter.QuickLaunch)
    expect(result.current.params.get('filter')).toBe('quick_launch')
  })
})
