import { useQuery } from '@tanstack/react-query'
import type { ChainId } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { type UniverseChainId, Platform } from '@universe/chains'
import { useMemo } from 'react'
import { liquidityQueries } from 'uniswap/src/data/apiClients/liquidityService/liquidityQueries'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { usePositionModifier } from 'uniswap/src/features/positions/hooks/usePositionModifier'
import { toLiquidityChainId } from 'uniswap/src/features/positions/utils'
import { logger } from 'utilities/src/logger/logger'
import { useEvent } from 'utilities/src/react/hooks'

export interface UseWalletPositionsBalanceParams {
  account?: string
  /** Defaults to the wallet's enabled EVM chains — `chain_ids` is required non-empty on the request. */
  chainIds?: UniverseChainId[]
}

export interface UseWalletPositionsBalanceResult {
  /** Undefined until a response lands, and while one hasn't — never coerced to 0. */
  totalLiquidityUsd: number | undefined
  /** Aggregate uncollected fees, USD, same undefined-until-settled semantics as the liquidity total. */
  totalFeesUsd: number | undefined
  /** False once the figure has settled, including when it settled as unknown. Never true forever. */
  isLoading: boolean
  /** No-ops while the query is disabled — TanStack's own refetch would fire the request anyway. */
  refetch: () => void
}

/**
 * A wallet's total USD liquidity and aggregate uncollected fees, from the liquidity service's
 * `GetWalletPositionsBalance`.
 *
 * The request sends the same visibility `modifier` the positions list uses (from persisted per-pool
 * overrides + spam visibility), so hidden positions don't count toward this total and the header
 * tracks the visible set. It still sends no `versions` and has no `statuses`/`range_statuses`, so a
 * version, lifecycle or range selection narrows the list without narrowing this figure.
 */
export function useWalletPositionsBalance({
  account,
  chainIds,
}: UseWalletPositionsBalanceParams): UseWalletPositionsBalanceResult {
  const { chains: defaultChains } = useEnabledChains({ platform: Platform.EVM })
  const modifier = usePositionModifier({ includeHidden: false })

  const requestChainIds = useMemo(
    () => (chainIds ?? defaultChains).map(toLiquidityChainId).filter((id): id is ChainId => id !== undefined),
    [chainIds, defaultChains],
  )

  // Explicit `chainIds` that all fail `toLiquidityChainId` leave nothing to request — reachable from
  // a chain-scoped route whose chain the liquidity service doesn't serve. That scope has no
  // answerable total, so it settles as unknown (`-`) rather than falling back to the wallet's
  // enabled chains: a wallet-wide figure under a header that means "on this chain" would be a wrong
  // number, which is the class of bug this hook exists to remove. Deliberate, not a stuck request —
  // hence the explicit `isLoading: false` below rather than relying on a disabled query's status.
  const hasRequestableChains = requestChainIds.length > 0

  const enabled = !!account && hasRequestableChains

  const { data, isLoading, refetch } = useQuery(
    liquidityQueries.getWalletPositionsBalance({
      params: { walletAddress: account, chainIds: requestChainIds, modifier },
      enabled,
    }),
  )

  const refetchIfEnabled = useEvent(() => {
    if (enabled) {
      // Query errors resolve into query state (the UI keeps the last good total); this catch only
      // sees exceptional rejections, so surface those instead of swallowing silently.
      refetch().catch((error) =>
        logger.warn('useWalletPositionsBalance.ts', 'refetchIfEnabled', 'refetch rejected', { error }),
      )
    }
  })

  return {
    totalLiquidityUsd: data?.totalLiquidityUsd,
    totalFeesUsd: data?.totalFeesUsd,
    isLoading: hasRequestableChains && isLoading,
    refetch: refetchIfEnabled,
  }
}
