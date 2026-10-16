import { useEffect } from 'react'
import { logEarnSurfaceViewed } from 'uniswap/src/features/earn/analytics'
import type { EarnAnalyticsEntryPoint, EarnAnalyticsSurface } from 'uniswap/src/features/telemetry/types'

export function useLogEarnSurfaceViewed({
  entryPoint,
  isReadOnly,
  isVisible,
  surface,
}: {
  entryPoint: EarnAnalyticsEntryPoint
  isReadOnly?: boolean
  isVisible: boolean
  surface: EarnAnalyticsSurface
}): void {
  useEffect(() => {
    if (!isVisible) {
      return
    }

    logEarnSurfaceViewed({
      entry_point: entryPoint,
      surface,
      ...(isReadOnly !== undefined && { is_read_only: isReadOnly }),
    })
  }, [entryPoint, isReadOnly, isVisible, surface])
}
