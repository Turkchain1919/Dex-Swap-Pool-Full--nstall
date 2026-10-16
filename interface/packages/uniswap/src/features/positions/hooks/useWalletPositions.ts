import type { PartialMessage } from '@bufbuild/protobuf'
import { PositionStatus, ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { PositionModifier, RangeStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import {
  PositionStatus as LiquidityPositionStatus,
  PositionSortBy,
} from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import type { UniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { useLiquidityServiceWalletPositions } from 'uniswap/src/features/positions/hooks/useLiquidityServiceWalletPositions'
import { usePositionModifier } from 'uniswap/src/features/positions/hooks/usePositionModifier'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import { getPositionKey } from 'uniswap/src/features/positions/utils'
import { useEvent } from 'utilities/src/react/hooks'

const DEFAULT_PROTOCOL_VERSIONS: ProtocolVersion[] = [ProtocolVersion.V2, ProtocolVersion.V3, ProtocolVersion.V4]
const DEFAULT_STATUSES: PositionStatus[] = [PositionStatus.IN_RANGE, PositionStatus.OUT_OF_RANGE]
const DEFAULT_PAGE_SIZE = 25

export interface UseWalletPositionsParams {
  account: string
  /** Optional chain filter - if omitted, fetches across all enabled chains. */
  chainIds?: UniverseChainId[]
  protocolVersions?: ProtocolVersion[]
  statuses?: PositionStatus[]
  /**
   * Whether hidden positions should be fetched too. Defaults to false. Enables a second hidden-only
   * complement query (HIDDEN is not a valid request status), whose results land in `hiddenPositions`.
   */
  includeHidden?: boolean
  /**
   * When true (default), follows `nextPageToken` until exhausted so the returned arrays
   * represent ALL of the wallet's positions. When false, only the first page is returned -
   * useful for previews (e.g. Portfolio Overview MiniTable showing top N) or for surfaces
   * that drive their own load-more UX (e.g. infinite-scroll sentinels on the Pools page).
   */
  autoFetchAllPages?: boolean
  pageSize?: number
  /**
   * When true, this observer is disabled and won't drive a fetch (forwarded to the query's
   * `enabled`). Callers compose this from whatever precondition should gate the query. Note:
   * if another mounted observer shares the same query key and is enabled, the underlying query
   * can still fetch. Defaults to false.
   */
  disabled?: boolean
  /**
   * Optional polling interval (ms). When set, the query refetches on this interval; a refetch
   * re-fetches all currently-loaded pages. Polling only runs while the query is enabled and the
   * document is foreground. Defaults to undefined (no polling).
   */
  pollInterval?: number
  /**
   * The exact statuses to request, sent straight through. When provided it takes precedence over
   * `statuses`/`includeHidden` — callers with a native status filter (open/closed/hidden) pass it
   * here so hidden is a status, not a side flag. When omitted, the request is derived from
   * `statuses` + `includeHidden`.
   */
  liquidityRequestStatuses?: LiquidityPositionStatus[]
  /** Server-side in/out-of-range refinement forwarded to the request. */
  liquidityRangeStatuses?: RangeStatus[]
  /** Spam-visibility + per-pool overrides forwarded to the GetWalletPositions request. */
  liquidityModifier?: PartialMessage<PositionModifier>
  /** Server-side sort forwarded to the GetWalletPositions request. */
  liquiditySortBy?: PositionSortBy
  liquidityAscending?: boolean
  /** Server-side search substring forwarded to the GetWalletPositions request. */
  liquiditySearch?: string
}

export const SORT_BY_USD_VALUE_DESC: Pick<UseWalletPositionsParams, 'liquiditySortBy' | 'liquidityAscending'> = {
  liquiditySortBy: PositionSortBy.LIQUIDITY,
  liquidityAscending: false,
}

// Derives the liquidity-service request statuses from the data-api status filter for generic callers
// that don't supply a native status list. In/out-of-range both map to OPEN. Lifecycle only: the
// service rejects HIDDEN as a request status — spam visibility travels in the request's modifier
// (see the hidden-complement query in the hook body).
function dataApiStatusesToRequestStatuses(statuses: PositionStatus[]): LiquidityPositionStatus[] {
  const mapped = new Set<LiquidityPositionStatus>()
  for (const status of statuses) {
    if (status === PositionStatus.IN_RANGE || status === PositionStatus.OUT_OF_RANGE) {
      mapped.add(LiquidityPositionStatus.OPEN)
    } else if (status === PositionStatus.CLOSED) {
      mapped.add(LiquidityPositionStatus.CLOSED)
    }
  }
  // Never send an empty lifecycle set: the BE reads `statuses: []` as "no filter" (all statuses), so
  // an input that maps to nothing (empty or UNSPECIFIED-only) would silently widen the query. Fall
  // back to the explicit OPEN+CLOSED lifecycle instead.
  if (mapped.size === 0) {
    mapped.add(LiquidityPositionStatus.OPEN)
    mapped.add(LiquidityPositionStatus.CLOSED)
  }
  return [...mapped]
}

// Matches the underlying liquidity-service GetWalletPositions query state.
type ForwardedQueryState = {
  isLoading: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  isPlaceholderData: boolean
  hasNextPage: boolean
  error: Error | null
  refetch: () => void
  fetchNextPage: () => Promise<unknown>
}

export interface UseWalletPositionsResult extends ForwardedQueryState {
  /** Positions visible to the wallet after applying the Redux visibility check. */
  positions: PositionInfo[]
  /**
   * Positions the Redux visibility check classifies as hidden. Note this can be non-empty
   * even with `includeHidden=false` if the visibility selector flags a server-returned
   * position as hidden client-side.
   */
  hiddenPositions: PositionInfo[]
  /** All parsed positions (visible + hidden), useful for total counts. */
  allPositions: PositionInfo[]
  /** Number of pages fetched so far (grows as `fetchNextPage` drains pagination). */
  pagesLoaded: number
  /**
   * True once the first page response has been received (success or empty).
   * Useful for distinguishing "still loading" from "errored before any data arrived".
   */
  hasData: boolean
}

/**
 * Shared hook for fetching, parsing, and partitioning a wallet's liquidity positions from the
 * liquidity-service `GetWalletPositions` endpoint. Auto-drains pages by default so consumers see the
 * wallet's complete position set without managing pagination themselves.
 */
export function useWalletPositions({
  account,
  chainIds,
  protocolVersions = DEFAULT_PROTOCOL_VERSIONS,
  statuses = DEFAULT_STATUSES,
  includeHidden = false,
  autoFetchAllPages = true,
  pageSize = DEFAULT_PAGE_SIZE,
  disabled = false,
  pollInterval,
  liquidityRequestStatuses,
  liquidityRangeStatuses,
  liquidityModifier,
  liquiditySortBy,
  liquidityAscending,
  liquiditySearch,
}: UseWalletPositionsParams): UseWalletPositionsResult {
  const requestStatuses = useMemo(
    () => liquidityRequestStatuses ?? dataApiStatusesToRequestStatuses(statuses),
    [liquidityRequestStatuses, statuses],
  )

  // Generic-caller (no explicit liquidityModifier) path mirrors web's contract usage: hidden is not a
  // request status (the service rejects HIDDEN), it's the complement set selected by the modifier's
  // `hiddenOnly` flag. The primary query fetches the visible set (spam excluded server-side, user
  // overrides applied); when the caller asked for hidden positions too, a second query fetches the
  // hidden-only complement and lands in `hiddenPositions`.
  const visibleModifier = usePositionModifier({ includeHidden: false })
  const hiddenOnlyModifier = usePositionModifier({ includeHidden: true })
  const wantsHiddenComplement = includeHidden && liquidityModifier === undefined

  const sharedLiquidityRequest = {
    account,
    chainIds,
    protocolVersions,
    requestStatuses,
    rangeStatuses: liquidityRangeStatuses,
    sortBy: liquiditySortBy,
    ascending: liquidityAscending,
    search: liquiditySearch,
    pageSize,
    pollInterval,
  }

  const liquidityServiceResult = useLiquidityServiceWalletPositions({
    ...sharedLiquidityRequest,
    modifier: liquidityModifier ?? visibleModifier,
    autoFetchAllPages,
    disabled,
  })

  // No user-hides gate here: the hidden set includes server spam flags the client can't know
  // about, so gating on local visibility state would drop spam-only wallets' hidden section.
  // Fully drained so the section is complete rather than page-bounded.
  const hiddenComplementResult = useLiquidityServiceWalletPositions({
    ...sharedLiquidityRequest,
    modifier: hiddenOnlyModifier,
    autoFetchAllPages: true,
    disabled: disabled || !wantsHiddenComplement,
  })

  const refetchWithHiddenComplement = useEvent(() => {
    liquidityServiceResult.refetch()
    hiddenComplementResult.refetch()
  })

  // Merged arrays are memoized on the underlying (render-stable) arrays, not the result objects,
  // so downstream position memos don't recompute on unrelated re-renders. Complement results are
  // hidden by provenance — the server applies the include/exclude overrides, so the complement is
  // exactly the hidden set — and its positions carry no spam marking (response status is
  // lifecycle-only), so an isPositionVisible re-check would misfile them; don't add one.
  // A visibility toggle refetches both queries, and mid-flight one side's placeholder can still
  // hold a position the other side's fresh response now returns — keep the primary's copy, whose
  // partition reflects the live Redux state.
  const complementOnlyPositions = useMemo(() => {
    const primaryKeys = new Set(liquidityServiceResult.allPositions.map(getPositionKey))
    return hiddenComplementResult.allPositions.filter((position) => !primaryKeys.has(getPositionKey(position)))
  }, [liquidityServiceResult.allPositions, hiddenComplementResult.allPositions])

  const mergedHiddenPositions = useMemo(
    () =>
      [...liquidityServiceResult.hiddenPositions, ...complementOnlyPositions].sort(
        (a, b) => (b.totalValueUsd ?? 0) - (a.totalValueUsd ?? 0),
      ),
    [liquidityServiceResult.hiddenPositions, complementOnlyPositions],
  )
  const mergedAllPositions = useMemo(
    () => [...liquidityServiceResult.allPositions, ...complementOnlyPositions],
    [liquidityServiceResult.allPositions, complementOnlyPositions],
  )

  // Fold the complement's first-load and error state in so a failing or in-flight complement isn't
  // indistinguishable from a settled, empty hidden section — while keeping the primary's pagination
  // semantics intact: isFetching (and hasNextPage/isFetchingNextPage) describe the visible list
  // only, since OR-ing the complement's isFetching would pin the flag true through its full-page
  // drain and stall `hasNextPage && !isFetching` load-more guards. The complement's error is also
  // deferred until the primary has settled, so a secondary failure can't blank a still-loading list
  // via the `!!error && !hasData` idiom.
  if (!wantsHiddenComplement) {
    return liquidityServiceResult
  }

  return {
    ...liquidityServiceResult,
    hiddenPositions: mergedHiddenPositions,
    allPositions: mergedAllPositions,
    isLoading: liquidityServiceResult.isLoading || hiddenComplementResult.isLoading,
    error: liquidityServiceResult.error ?? (liquidityServiceResult.hasData ? hiddenComplementResult.error : null),
    refetch: refetchWithHiddenComplement,
  }
}
