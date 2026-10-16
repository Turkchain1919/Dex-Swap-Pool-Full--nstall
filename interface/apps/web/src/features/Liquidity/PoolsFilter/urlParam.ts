import { parseAsJson } from 'nuqs'
import { z } from 'zod'
import { EMPTY_POOLS_FILTER_STATE, type PoolsFilterState } from '~/types/poolsFilter'

// chainId / protocols are numeric enums (UniverseChainId / ProtocolVersion) — validated as numbers here
// and cast back to the branded types, which are numbers at runtime.
const poolsFilterSchema = z.object({
  chainId: z.number().optional(),
  protocols: z.array(z.number()),
  aprMin: z.string(),
  aprMax: z.string(),
  rewardsOnly: z.boolean(),
  tvlBucketId: z.string().optional(),
})

/** Serializes the whole advanced pools filter as one JSON query param, defaulting to the empty filter. */
export const parseAsPoolsFilter = parseAsJson((v) => poolsFilterSchema.parse(v) as PoolsFilterState).withDefault(
  EMPTY_POOLS_FILTER_STATE,
)
