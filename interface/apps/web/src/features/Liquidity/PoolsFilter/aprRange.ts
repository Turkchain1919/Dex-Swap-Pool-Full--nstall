import { useMemo } from 'react'
import type { PoolStat } from '~/types/explore'
import type { PoolsAprRange } from '~/types/poolsFilter'

/**
 * Smallest/largest APR (percent) across the given pools, for the filter modal's APR placeholder hints.
 * ListPools has no APR-range aggregate, so this is over the loaded set — which reflects the active filter:
 * once an APR bound is applied the hints narrow to the filtered pools rather than the true floor/ceiling.
 */
export function getPoolsAprRange(pools: PoolStat[] | undefined): PoolsAprRange | undefined {
  const values = (pools ?? []).flatMap((pool) =>
    pool.apr !== undefined && Number.isFinite(pool.apr) ? Number(pool.apr.toFixed(2)) : [],
  )
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : undefined
}

/** Memoized {@link getPoolsAprRange}; stable across renders while the pool list reference is unchanged. */
export function usePoolsAprRange(pools: PoolStat[] | undefined): PoolsAprRange | undefined {
  return useMemo(() => getPoolsAprRange(pools), [pools])
}
