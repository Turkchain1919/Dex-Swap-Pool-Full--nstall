import {
  Content,
  ContentStyle,
  Notification,
  OnClick,
} from '@uniswap/client-notification-service/dist/uniswap/notificationservice/v1/api_pb'
import { type InAppNotification, OnClickAction } from '@universe/api'
import { UniverseChainId } from '@universe/chains'
import { createNotificationDataSource, type NotificationDataSource } from '@universe/notifications'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { DEFAULT_MS_BEFORE_WARNING } from 'uniswap/src/features/chains/evm/rpc'
import i18n from 'uniswap/src/i18n'
import { getLogger } from 'utilities/src/logger/logger'
import { ONE_SECOND_MS } from 'utilities/src/time/time'
import {
  createVisibilitySettlingController,
  subscribeToDocumentVisibilityChange,
} from '~/notification-service/data-sources/createVisibilitySettlingController'

/**
 * System alert types in priority order (highest first).
 * When multiple alerts are active, only the highest priority is shown.
 */
enum SystemAlertType {
  /** Chain connectivity warning - block timestamp significantly behind staleness-check time */
  ChainConnectivity = 'chain_connectivity',
}

const DEFAULT_POLL_INTERVAL_MS = 5 * ONE_SECOND_MS
// Long enough for a focus-triggered multicall refetch, short enough to avoid masking a real warning.
const DEFAULT_VISIBILITY_SETTLING_MS = 10 * ONE_SECOND_MS
const LOG_FILE_TAG = 'createSystemAlertsDataSource'
const SYSTEM_ALERTS_SOURCE = 'system_alerts'

/**
 * Priority order for system alerts.
 * Lower index = higher priority.
 */
const ALERT_PRIORITY: SystemAlertType[] = [SystemAlertType.ChainConnectivity]

/**
 * Dependencies that must be provided from React hooks.
 * These are passed as getter functions to allow checking at poll time.
 */
interface CreateSystemAlertsDataSourceContext {
  /** Get the current swap input chain ID (from UniswapContext) */
  getSwapInputChainId: () => UniverseChainId | undefined
  /** Get the current block timestamp (from useCurrentBlockTimestamp) */
  getBlockTimestamp: () => bigint | undefined
  /** Get the time (ms) the block timestamp was last fetched (from useCurrentBlockTimestamp) */
  getBlockTimestampUpdatedAt: () => number
  /**
   * Get the reference time (ms) used to evaluate chain-staleness. Sourced from useMachineTimeMs,
   * which advances on a fixed cadence regardless of refetches — this is the "is the chain
   * keeping up?" clock, distinct from wall-clock visibility bookkeeping.
   */
  getStalenessCheckTimeMs: () => number
  /** Get the current pathname (from useLocation) */
  getPathname: () => string
  /** Whether the document is currently visible. Defaults to `document.visibilityState === 'visible'`. */
  getIsDocumentVisible?: () => boolean
  /** Current wall-clock time in ms. Defaults to `Date.now()`. Used for visibility/window bookkeeping. */
  getWallClockTimeMs?: () => number
  /** Subscribe to document visibility changes. Defaults to a `visibilitychange` listener. Injected for tests. */
  subscribeToVisibilityChange?: (listener: () => void) => () => void
  /** How long to wait after returning to a visible tab if the block timestamp has not refreshed yet. */
  visibilitySettlingMs?: number
  /** Polling interval in milliseconds (default: 5000ms) */
  pollIntervalMs?: number
}

/**
 * Checks if chain connectivity warning should be shown.
 */
function checkChainConnectivity(ctx: {
  swapInputChainId: UniverseChainId | undefined
  blockTimestamp: bigint | undefined
  stalenessCheckTimeMs: number
  isLandingPage: boolean
}): { shouldShow: boolean; notification?: InAppNotification } {
  const { swapInputChainId, blockTimestamp, stalenessCheckTimeMs, isLandingPage } = ctx

  // Don't show on landing page
  if (isLandingPage) {
    return { shouldShow: false }
  }

  // Need chain ID and block timestamp to check
  if (!swapInputChainId || !blockTimestamp) {
    return { shouldShow: false }
  }

  const chainInfo = getChainInfo(swapInputChainId)
  const waitMsBeforeWarning = chainInfo.blockWaitMsBeforeWarning ?? DEFAULT_MS_BEFORE_WARNING

  // Check if block is stale
  const blockTimeMs = Number(blockTimestamp) * 1000
  const isStale = stalenessCheckTimeMs - blockTimeMs > waitMsBeforeWarning

  if (!isStale) {
    return { shouldShow: false }
  }

  return {
    shouldShow: true,
    notification: createChainConnectivityNotification({
      chainLabel: chainInfo.label,
      chainId: swapInputChainId,
      isMainnet: swapInputChainId === UniverseChainId.Mainnet,
      statusPageUrl: chainInfo.statusPage,
    }),
  }
}

/**
 * Stable dedup key for an active alert. Includes the notification id so that two
 * alerts of the same type but different ids (e.g., outage banners on different chains)
 * are treated as distinct.
 */
function getSystemAlertKey(alert: { type: SystemAlertType; notification: InAppNotification }): string {
  return `${alert.type}:${alert.notification.id}`
}

/**
 * Creates a data source for web system alerts (chain connectivity, outage warnings).
 *
 * Features:
 * - Polls conditions periodically
 * - Priority-based display (only shows highest priority active alert)
 * - Reads Zustand stores and dynamic config directly (no refs needed)
 * - Uses i18n for all user-facing strings
 * - Suppresses chain-connectivity warnings during a settling window after the
 *   tab regains visibility, until the block timestamp refreshes or the window expires
 *
 * @example
 * ```typescript
 * const systemAlertsDataSource = createSystemAlertsDataSource({
 *   getSwapInputChainId: () => swapInputChainIdRef.current,
 *   getBlockTimestamp: () => blockTimestampRef.current,
 *   getBlockTimestampUpdatedAt: () => blockTimestampUpdatedAtRef.current,
 *   getStalenessCheckTimeMs: () => machineTimeRef.current,
 *   getPathname: () => pathnameRef.current,
 * })
 * ```
 */
export function createSystemAlertsDataSource(ctx: CreateSystemAlertsDataSourceContext): NotificationDataSource {
  const {
    getSwapInputChainId,
    getBlockTimestamp,
    getBlockTimestampUpdatedAt,
    getStalenessCheckTimeMs,
    getPathname,
    getIsDocumentVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible',
    getWallClockTimeMs = () => Date.now(),
    subscribeToVisibilityChange = subscribeToDocumentVisibilityChange,
    visibilitySettlingMs = DEFAULT_VISIBILITY_SETTLING_MS,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  } = ctx

  const visibilityController = createVisibilitySettlingController({
    getBlockTimestampUpdatedAt,
    getIsDocumentVisible,
    getWallClockTimeMs,
    subscribeToVisibilityChange,
    visibilitySettlingMs,
    pollIntervalMs,
  })

  let intervalId: ReturnType<typeof setInterval> | null = null
  let currentCallback: ((notifications: InAppNotification[], source: string) => void) | null = null
  let lastEmittedAlertKey: string | null = null

  /**
   * Check all conditions and return the highest priority active alert.
   */
  const getActiveAlert = ({
    suppressChainConnectivity = false,
  }: {
    suppressChainConnectivity?: boolean
  } = {}): { type: SystemAlertType; notification: InAppNotification } | null => {
    const pathname = getPathname()
    const isLandingPage = pathname === '/'

    const checkers: Record<SystemAlertType, () => { shouldShow: boolean; notification?: InAppNotification }> = {
      [SystemAlertType.ChainConnectivity]: () =>
        checkChainConnectivity({
          swapInputChainId: getSwapInputChainId(),
          blockTimestamp: getBlockTimestamp(),
          stalenessCheckTimeMs: getStalenessCheckTimeMs(),
          isLandingPage,
        }),
    }

    for (const alertType of ALERT_PRIORITY) {
      // oxlint-disable-next-line typescript/no-unnecessary-condition
      if (suppressChainConnectivity && alertType === SystemAlertType.ChainConnectivity) {
        continue
      }

      try {
        const result = checkers[alertType]()
        if (result.shouldShow && result.notification) {
          return { type: alertType, notification: result.notification }
        }
      } catch (error) {
        getLogger().error(error, {
          tags: { file: LOG_FILE_TAG, function: 'getActiveAlert' },
          extra: { alertType },
        })
      }
    }

    return null
  }

  const checkAndEmit = (): void => {
    if (!currentCallback) {
      return
    }

    const { shouldEvaluateAlerts, suppressChainConnectivity } = visibilityController.tick()
    if (!shouldEvaluateAlerts) {
      return
    }

    try {
      const activeAlert = getActiveAlert({ suppressChainConnectivity })

      if (activeAlert) {
        const activeAlertKey = getSystemAlertKey(activeAlert)

        // Only emit if alert changed to avoid unnecessary updates
        if (lastEmittedAlertKey !== activeAlertKey) {
          lastEmittedAlertKey = activeAlertKey
          currentCallback([activeAlert.notification], SYSTEM_ALERTS_SOURCE)
        }
      } else if (lastEmittedAlertKey !== null) {
        lastEmittedAlertKey = null
        currentCallback([], SYSTEM_ALERTS_SOURCE)
      }
    } catch (error) {
      getLogger().error(error, {
        tags: { file: LOG_FILE_TAG, function: 'checkAndEmit' },
      })
    }
  }

  const start = (onNotifications: (notifications: InAppNotification[], source: string) => void): void => {
    if (intervalId) {
      return
    }

    currentCallback = onNotifications
    lastEmittedAlertKey = null
    visibilityController.start()

    // Check immediately on start
    checkAndEmit()

    // Then poll at interval
    intervalId = setInterval(checkAndEmit, pollIntervalMs)
  }

  const stop = async (): Promise<void> => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    visibilityController.stop()
    currentCallback = null
    lastEmittedAlertKey = null
  }

  return createNotificationDataSource({ start, stop })
}

// ============================================================================
// Helper functions for creating system alert notifications
// ============================================================================

/**
 * Creates a chain connectivity warning notification.
 */
function createChainConnectivityNotification(params: {
  chainLabel: string
  chainId: number
  isMainnet: boolean
  statusPageUrl?: string
}): InAppNotification {
  const { chainLabel, chainId, isMainnet, statusPageUrl } = params

  const title = i18n.t('network.warning')
  const subtitle = isMainnet ? i18n.t('network.lostConnection') : i18n.t('network.mightBeDown', { network: chainLabel })

  const notification = new Notification({
    id: `local:session:chain_connectivity:${chainId}`,
    content: new Content({
      style: ContentStyle.SYSTEM_BANNER,
      title,
      subtitle,
      iconLink: 'custom:caution-triangle',
      onDismissClick: new OnClick({
        onClick: [OnClickAction.DISMISS, OnClickAction.ACK],
      }),
      buttons: statusPageUrl
        ? [
            {
              text: i18n.t('common.button.learn'),
              isPrimary: false,
              onClick: new OnClick({
                onClick: [OnClickAction.EXTERNAL_LINK],
                onClickLink: statusPageUrl,
              }),
            },
          ]
        : [],
    }),
  })

  return notification
}
