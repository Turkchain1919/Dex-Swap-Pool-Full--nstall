import type { UniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { useLiquidityServiceGetPool } from '~/features/Liquidity/hooks/useLiquidityServiceGetPool'
import { normalizeTickSpacing } from '~/features/Liquidity/hooks/usePoolTickData'
import { normalizePoolSummary, type PoolFromGetPool } from '~/features/Liquidity/utils/normalizePoolSummary'

/**
 * The PDP charts' single-pool lookup, keyed on `{chainId, poolId}` via liquidity-service `GetPool`
 * (version resolved by the backend). Request params mirror `useLiquidityServicePoolData` so React
 * Query shares the PDP's existing cache entry. Returns the canonical `Pool` shape, minus the fields
 * `GetPool` has no schema for (see `PoolFromGetPool`).
 */
export function usePdpPool({
  poolId,
  chainId,
  enabled = true,
}: {
  poolId?: string
  chainId: UniverseChainId
  enabled?: boolean
}): { pool: PoolFromGetPool | undefined; isLoading: boolean } {
  const { data, isLoading } = useLiquidityServiceGetPool({ chainId, poolId, enabled })

  const pool = useMemo(() => {
    const normalized = data?.pool ? normalizePoolSummary(data.pool) : undefined
    // v2's tick_spacing is proto3-optional (absent decodes to undefined already), but an explicit 0
    // would still slip past consumers' `??` fallback reads — normalize it here.
    return normalized && { ...normalized, tickSpacing: normalizeTickSpacing(normalized.tickSpacing) }
  }, [data])

  return { pool, isLoading }
}
