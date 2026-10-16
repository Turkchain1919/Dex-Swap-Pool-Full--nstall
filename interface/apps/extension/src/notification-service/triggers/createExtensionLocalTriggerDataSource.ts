import {
  createLocalTriggerDataSource,
  type NotificationDataSource,
  type NotificationTracker,
  type TriggerCondition,
} from '@universe/notifications'
import { createAppRatingTrigger } from 'src/notification-service/triggers/appRatingTrigger'
import { type ExtensionState } from 'src/store/extensionReducer'
import { createBackupReminderTrigger } from 'wallet/src/features/behaviorHistory/backupReminderTrigger'
import { setAppRating } from 'wallet/src/features/wallet/slice'

type ExtensionTriggerDispatch = (action: ReturnType<typeof setAppRating>) => void

/**
 * Context required to create the extension local trigger data source.
 */
interface CreateExtensionLocalTriggerDataSourceContext {
  /** Function to get the current Redux state */
  getState: () => ExtensionState
  /** Redux dispatch function */
  dispatch: ExtensionTriggerDispatch
  /** Notification tracker for checking processed state */
  tracker: NotificationTracker
  /** Function to get current portfolio value in USD for the active account */
  getPortfolioValue: () => Promise<number>
  /** How often to check triggers in milliseconds (default: 5000ms) */
  pollIntervalMs?: number
}

/**
 * All trigger conditions for the extension.
 * Add new triggers here as they are migrated.
 */
function getExtensionTriggers(ctx: {
  getState: () => ExtensionState
  dispatch: ExtensionTriggerDispatch
  getPortfolioValue: () => Promise<number>
}): TriggerCondition[] {
  return [
    createAppRatingTrigger(ctx),
    createBackupReminderTrigger({ getState: ctx.getState, getPortfolioValue: ctx.getPortfolioValue }),
    // Future triggers can be added here:
    // createSmartWalletCreatedTrigger(ctx),
    // createSmartWalletNudgeTrigger(ctx),
    // createSmartWalletEnabledTrigger(ctx),
  ]
}

/**
 * Creates a data source for all extension local trigger notifications.
 *
 * This combines all extension-specific triggers (app rating, smart wallet nudges, etc.)
 * into a single data source that can be added to the notification service.
 */
export function createExtensionLocalTriggerDataSource(
  ctx: CreateExtensionLocalTriggerDataSourceContext,
): NotificationDataSource {
  const { getState, dispatch, tracker, getPortfolioValue, pollIntervalMs = 5000 } = ctx

  const triggers = getExtensionTriggers({ getState, dispatch, getPortfolioValue })

  return createLocalTriggerDataSource({
    triggers,
    tracker,
    pollIntervalMs,
    source: 'extension_local_triggers',
    logFileTag: 'createExtensionLocalTriggerDataSource',
  })
}

/**
 * Check if a notification ID is a local trigger notification.
 * Local trigger notifications use the 'local:' prefix.
 */
export function isLocalTriggerNotification(notificationId: string): boolean {
  return notificationId.startsWith('local:')
}
