import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { UniverseChainId } from '@universe/chains'
import { POOLS_FILTER_TVL_BUCKETS } from '~/features/Liquidity/PoolsFilter/constants'
import type { PoolsFilterState } from '~/types/poolsFilter'

interface StatRange {
  min?: number
  max?: number
}

/**
 * The pieces of a ListPools request the advanced pools filter contributes. Plain objects, assignable to
 * the request's `chainIds` / `filter.protocolVersions` / `filter.statsFilter`.
 */
export interface PoolsFilterRequestParams {
  chainId?: UniverseChainId
  protocolVersions?: ProtocolVersion[]
  statsFilter?: { tvl?: StatRange; apr?: StatRange }
  rewardsOnly?: boolean
}

function parseRangeBound(value: string): number | undefined {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Maps the advanced pools filter state onto the backend ListPools request. APR is served in the same
 * percent units the UI shows (4.99 = 4.99%), so the raw `%` inputs pass straight through; TVL buckets
 * map to a USD min/max range; the rewards toggle maps to `filter.rewards_only`.
 *
 * (Fee tier was dropped from the UI entirely: the request filters fee by an exact-tier set, not a range.)
 */
export function toPoolsFilterRequestParams(state: PoolsFilterState): PoolsFilterRequestParams {
  const protocolVersions = state.protocols.length > 0 ? state.protocols : undefined

  const tvl = state.tvlBucketId
    ? POOLS_FILTER_TVL_BUCKETS.find((bucket) => bucket.id === state.tvlBucketId)?.range
    : undefined

  const aprMin = parseRangeBound(state.aprMin)
  const aprMax = parseRangeBound(state.aprMax)
  const apr = aprMin !== undefined || aprMax !== undefined ? { min: aprMin, max: aprMax } : undefined

  const statsFilter = tvl || apr ? { tvl, apr } : undefined

  // Only send when on — an unset rewards_only means "no rewards filter".
  const rewardsOnly = state.rewardsOnly ? true : undefined

  return { chainId: state.chainId, protocolVersions, statsFilter, rewardsOnly }
}

/**
 * How many filter categories are active, for the Filter button's count badge. Derived from the request
 * mapping so the badge counts exactly what actually filters the query — an unparseable APR input or an
 * empty protocol selection doesn't count. Network, protocol, TVL, APR, and rewards each count at most once.
 */
export function countActivePoolsFilters(state: PoolsFilterState): number {
  const { chainId, protocolVersions, statsFilter, rewardsOnly } = toPoolsFilterRequestParams(state)
  return [chainId !== undefined, !!protocolVersions, !!statsFilter?.tvl, !!statsFilter?.apr, !!rewardsOnly].filter(
    Boolean,
  ).length
}
