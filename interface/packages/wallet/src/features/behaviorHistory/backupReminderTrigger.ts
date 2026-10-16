import { ContentStyle, type InAppNotification, OnClickAction, serializeNotificationExtra } from '@universe/api'
import { AccountType } from 'uniswap/src/features/accounts/types'
import { ONE_DAY_MS } from 'utilities/src/time/time'
import { selectBackupReminderLastSeenTs } from 'wallet/src/features/behaviorHistory/selectors'
import { hasExternalBackup } from 'wallet/src/features/wallet/accounts/utils'
import { selectActiveAccount } from 'wallet/src/features/wallet/selectors'
import { type WalletState } from 'wallet/src/state/walletReducer'

export const BACKUP_REMINDER_NOTIFICATION_ID = 'local:backup_reminder_modal'

const BACKUP_REMINDER_COOLDOWN_MS = ONE_DAY_MS

/**
 * Minimum portfolio value in USD to show the backup reminder.
 * Deliberately a single value shared by mobile and extension so both platforms nudge on the same rule.
 */
const BACKUP_REMINDER_MIN_PORTFOLIO_VALUE_USD = 10

interface CreateBackupReminderTriggerContext {
  getState: () => WalletState
  getPortfolioValue: () => Promise<number>
}

export interface BackupReminderTrigger {
  id: string
  shouldShow: () => Promise<boolean>
  createNotification: () => InAppNotification
}

/**
 * Creates the shared mobile/extension recovery-phrase reminder trigger.
 *
 * Shows when the active account is a signer with no external backup, the 24h cooldown has
 * elapsed, and the portfolio value is above the minimum.
 */
export function createBackupReminderTrigger({
  getState,
  getPortfolioValue,
}: CreateBackupReminderTriggerContext): BackupReminderTrigger {
  return {
    id: BACKUP_REMINDER_NOTIFICATION_ID,

    shouldShow: async (): Promise<boolean> => {
      const state = getState()
      const activeAccount = selectActiveAccount(state)

      if (activeAccount?.type !== AccountType.SignerMnemonic || hasExternalBackup(activeAccount)) {
        return false
      }

      const lastSeenTs = selectBackupReminderLastSeenTs(state)
      if (lastSeenTs && Date.now() - lastSeenTs < BACKUP_REMINDER_COOLDOWN_MS) {
        return false
      }

      try {
        const portfolioValue = await getPortfolioValue()
        return portfolioValue > BACKUP_REMINDER_MIN_PORTFOLIO_VALUE_USD
      } catch {
        return false
      }
    },

    createNotification: (): InAppNotification => ({
      id: BACKUP_REMINDER_NOTIFICATION_ID,
      metadata: {
        owner: 'local',
        business: 'backup_reminder',
      },
      content: {
        style: ContentStyle.MODAL,
        title: '',
        subtitle: '',
        version: 0,
        buttons: [],
        // Keep the rendered modal mounted until the user dismisses it, even if a later poll's
        // shouldShow flips false while it is open (extension records the cooldown on show; a
        // transient portfolio-fetch failure can flip it on either platform). Each platform's
        // renderer/modal owns when the cooldown timestamp is written.
        extra: serializeNotificationExtra({ persistUntilInteraction: true }),
        onDismissClick: {
          onClick: [OnClickAction.DISMISS],
        },
      },
    }),
  }
}

export function isBackupReminderNotification(notification: InAppNotification): boolean {
  return notification.id === BACKUP_REMINDER_NOTIFICATION_ID
}
