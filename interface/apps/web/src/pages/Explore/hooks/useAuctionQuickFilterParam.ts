import { FeatureFlags, useFeatureFlag, useStatsigClientStatus } from '@universe/gating'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  AuctionQuickFilter,
  useExploreTablesFilterStore,
  useExploreTablesFilterStoreActions,
} from '~/features/Explore/state/exploreTablesFilterStore'

/**
 * URL query param backing the auction quick-filter selection so specific tabs are shareable.
 * Landmine: in-app links carrying this param must not target the already-mounted auctions tab —
 * the value is adopted from a mount-time snapshot, so the store won't pick it up and the URL
 * mirror will strip it. Cold loads and navigations that remount the chips are fine.
 */
export const AUCTION_FILTER_PARAM = 'filter'

/**
 * Parses `?filter=` into an AuctionQuickFilter. Unknown values and the default (All) resolve to
 * undefined so the caller falls back to the default selection. QuickLaunch is accepted here even
 * though its chip is flag-gated: flags read as false until statsig settles, so rejecting it at
 * parse time would erase valid deep links — useSyncAuctionQuickFilterParam enforces the gate once
 * it has resolved.
 */
export function auctionQuickFilterFromParam(value: string | null): AuctionQuickFilter | undefined {
  const filter = Object.values(AuctionQuickFilter).find((quickFilter) => quickFilter === value)
  if (!filter || filter === AuctionQuickFilter.All) {
    return undefined
  }
  return filter
}

/**
 * Mirrors the selected auction quick filter into the `?filter=` URL param (history replace, so
 * chip clicks don't grow the back stack). The default (All) is kept out of the URL. A URL-seeded
 * QuickLaunch selection is only rejected once statsig has settled with the gate off — never while
 * the flag is still resolving, so refreshing a deep link can't erase it.
 */
export function useSyncAuctionQuickFilterParam(): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const quickFilter = useExploreTablesFilterStore((state) => state.quickFilter)
  const { setQuickFilter } = useExploreTablesFilterStoreActions()
  const { isStatsigReady } = useStatsigClientStatus()
  const isQuickLaunchEnabled = useFeatureFlag(FeatureFlags.QuickLaunch)

  // Client-side navigations to the auctions tab remount these chips without recreating the store,
  // so an explicit URL value is adopted once per mount; the store stays the source of truth after.
  // Captured lazily so the effect can't loop with the mirror below.
  const [urlFilterAtMount] = useState(() => auctionQuickFilterFromParam(searchParams.get(AUCTION_FILTER_PARAM)))
  useEffect(() => {
    if (urlFilterAtMount) {
      setQuickFilter(urlFilterAtMount)
    }
  }, [urlFilterAtMount, setQuickFilter])

  useEffect(() => {
    if (isStatsigReady && !isQuickLaunchEnabled && quickFilter === AuctionQuickFilter.QuickLaunch) {
      setQuickFilter(AuctionQuickFilter.All)
    }
  }, [isStatsigReady, isQuickLaunchEnabled, quickFilter, setQuickFilter])

  useEffect(() => {
    const updated = new URLSearchParams(searchParams)
    if (quickFilter === AuctionQuickFilter.All) {
      updated.delete(AUCTION_FILTER_PARAM)
    } else {
      updated.set(AUCTION_FILTER_PARAM, quickFilter)
    }
    if (updated.toString() === searchParams.toString()) {
      return
    }
    setSearchParams(updated, { replace: true })
  }, [quickFilter, searchParams, setSearchParams])
}
