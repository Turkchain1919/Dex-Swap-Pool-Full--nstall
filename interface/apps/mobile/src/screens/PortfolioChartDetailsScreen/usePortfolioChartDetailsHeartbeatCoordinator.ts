import { useQueryClient } from '@tanstack/react-query'
import { useHeartbeatCoordinator } from 'src/utils/useHeartbeatCoordinator'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

/**
 * Drives a synchronized 60s refresh of the portfolio chart/PnL screen's wallet balances and PnL.
 * There is no 30s price tick, and the value chart is intentionally not on the tick — these are
 * Zerion-backed queries, so the cadence is kept conservative to limit call volume.
 */
export function usePortfolioChartDetailsHeartbeatCoordinator(): void {
  const queryClient = useQueryClient()

  const refresh = async (): Promise<void> => {
    await Promise.allSettled([
      queryClient.refetchQueries({ queryKey: [ReactQueryCacheKey.GetWalletBalances], type: 'active' }),
      queryClient.refetchQueries({ queryKey: [ReactQueryCacheKey.GetWalletProfitLoss], type: 'active' }),
    ])
  }

  useHeartbeatCoordinator({ refresh })
}
