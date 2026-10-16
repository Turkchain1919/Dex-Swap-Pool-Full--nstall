import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { PoolsFilterTvlBucketId } from '~/types/poolsFilter'

/** Protocol versions selectable in the advanced pools filter (order matches the Figma chip row). */
export const POOLS_FILTER_PROTOCOLS: ProtocolVersion[] = [ProtocolVersion.V4, ProtocolVersion.V3, ProtocolVersion.V2]

/**
 * TVL quick-select buckets: each id maps to the USD range sent to the backend `statsFilter.tvl`.
 * Typed by `PoolsFilterTvlBucketId` so ids stay in sync with the state field and the chip labels.
 * The chip labels are rendered as literal `t()` calls in PoolsFilterModal so the i18n extractor finds them.
 */
export const POOLS_FILTER_TVL_BUCKETS: { id: PoolsFilterTvlBucketId; range: { min?: number; max?: number } }[] = [
  { id: 'lt-100k', range: { max: 100_000 } },
  { id: '100k-1m', range: { min: 100_000, max: 1_000_000 } },
  { id: 'gt-10m', range: { min: 10_000_000 } },
]
