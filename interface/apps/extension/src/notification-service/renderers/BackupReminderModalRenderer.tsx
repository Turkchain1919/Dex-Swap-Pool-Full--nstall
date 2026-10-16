import { type InAppNotification } from '@universe/api'
import { type NotificationClickTarget } from '@universe/notifications'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { BackupReminderModal } from 'src/app/features/backupReminder/BackupReminderModal'
import { setBackupReminderLastSeenTs } from 'wallet/src/features/behaviorHistory/slice'

interface BackupReminderModalRendererProps {
  notification: InAppNotification
  onNotificationClick?: (notificationId: string, target: NotificationClickTarget) => void
  onNotificationShown?: (notificationId: string) => void
}

/**
 * Wrapper that renders the BackupReminderModal within the notification service.
 *
 * The cooldown is recorded when the modal is shown so closing the extension or browser cannot
 * immediately re-prompt. The notification is marked to persist until interaction, so subsequent
 * trigger polls do not tear down the open modal after that cooldown starts.
 */
export function BackupReminderModalRenderer({
  notification,
  onNotificationClick,
  onNotificationShown,
}: BackupReminderModalRendererProps): JSX.Element {
  const dispatch = useDispatch()

  // Report when the modal is shown
  useEffect(() => {
    dispatch(setBackupReminderLastSeenTs(Date.now()))
    onNotificationShown?.(notification.id)
  }, [dispatch, notification.id, onNotificationShown])

  const handleClose = (): void => {
    onNotificationClick?.(notification.id, { type: 'dismiss' })
  }

  return <BackupReminderModal onClose={handleClose} />
}
