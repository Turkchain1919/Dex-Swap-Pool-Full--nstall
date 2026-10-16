import { getChainLabel } from 'uniswap/src/features/chains/utils'
import {
  getIsPermissionedForAnalytics,
  permissionedAnalyticsTokenFromQuoteParams,
} from 'uniswap/src/features/permissionedTokens/getIsPermissionedForAnalytics'
import { SwapEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { SwapEventType, timestampTracker } from 'uniswap/src/features/transactions/swap/utils/SwapEventTimestampTracker'
import { logger } from 'utilities/src/logger/logger'

export function logSwapQuoteFetch({
  chainId,
  tokenOutChainId,
  tokenIn,
  tokenOut,
  isUSDQuote = false,
  isQuickRoute = false,
  quoteSource,
  pollInterval,
}: {
  chainId: number
  tokenOutChainId: number
  tokenIn: string
  tokenOut: string
  isUSDQuote?: boolean
  isQuickRoute?: boolean
  quoteSource?: 'routing_api' | 'trading_api'
  pollInterval?: number
}): void {
  let performanceMetrics = {}
  if (!isUSDQuote) {
    const hasSetSwapQuote = timestampTracker.hasTimestamp(SwapEventType.FirstQuoteFetchStarted)
    const elapsedTime = timestampTracker.setElapsedTime(SwapEventType.FirstQuoteFetchStarted)

    // We only log the time_to_first_quote_request metric for the first quote request of a session.
    const time_to_first_quote_request = hasSetSwapQuote ? undefined : elapsedTime
    const time_to_first_quote_request_since_first_input = hasSetSwapQuote
      ? undefined
      : timestampTracker.getElapsedTime(SwapEventType.FirstQuoteFetchStarted, SwapEventType.FirstSwapAction)

    performanceMetrics = { time_to_first_quote_request, time_to_first_quote_request_since_first_input }
  }
  // Fires before the quote resolves, so a truly cold `/permissions` cache yields undefined
  // (property omitted) rather than a wrong `false`.
  const is_permissioned = getIsPermissionedForAnalytics([
    permissionedAnalyticsTokenFromQuoteParams({ address: tokenIn, chainId }),
    permissionedAnalyticsTokenFromQuoteParams({ address: tokenOut, chainId: tokenOutChainId }),
  ])
  sendAnalyticsEvent(SwapEventName.SwapQuoteFetch, {
    chainId,
    isQuickRoute,
    isUSDQuote,
    quoteSource,
    pollInterval,
    is_permissioned,
    ...performanceMetrics,
  })
  logger.info('analytics', 'logSwapQuoteFetch', SwapEventName.SwapQuoteFetch, {
    chainId,
    // we explicitly log it here to show on Datadog dashboard
    chainLabel: getChainLabel(chainId),
    isQuickRoute,
    isUSDQuote,
    quoteSource,
    pollInterval,
    is_permissioned,
    ...performanceMetrics,
  })
}
