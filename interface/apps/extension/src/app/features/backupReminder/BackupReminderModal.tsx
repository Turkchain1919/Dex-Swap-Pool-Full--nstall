import { useTranslation } from 'react-i18next'
import { AppRoutes, SettingsRoutes } from 'src/app/navigation/constants'
import { useExtensionNavigation } from 'src/app/navigation/utils'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { WarningSeverity } from 'uniswap/src/components/modals/WarningModal/types'
import { WarningModal } from 'uniswap/src/components/modals/WarningModal/WarningModal'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { useBooleanState } from 'utilities/src/react/useBooleanState'
import { BackupReminderContent } from 'wallet/src/components/backup/BackupReminderContent'

interface BackupReminderModalProps {
  onClose: () => void
}

/**
 * Recovery-phrase backup reminder shown to signer wallets without an external backup.
 *
 * Surfaced by the notification service (see backupReminderTrigger). Matches mobile's UX:
 * the modal cannot be dismissed via the scrim, and "Remind me later" routes through an
 * "are you sure?" speedbump. Every close path routes through `onClose`, which reports the
 * explicit dismissal to the notification service.
 */
export function BackupReminderModal({ onClose }: BackupReminderModalProps): JSX.Element {
  const { t } = useTranslation()
  const { navigateTo } = useExtensionNavigation()
  const { value: isSpeedbumpOpen, setTrue: openSpeedbump, setFalse: closeSpeedbump } = useBooleanState(false)

  const onPressBackup = (): void => {
    navigateTo(`/${AppRoutes.Settings}/${SettingsRoutes.BackupRecoveryPhrase}`)
    onClose()
  }

  if (isSpeedbumpOpen) {
    return (
      <WarningModal
        isOpen
        isDismissible={false}
        modalName={ModalName.BackupReminderWarning}
        severity={WarningSeverity.High}
        title={t('onboarding.backup.reminder.warning.title')}
        // Mobile's warning.description mentions losing your phone; reuse the extension-appropriate copy
        caption={t('onboarding.home.intro.backup.description.extension')}
        rejectText={t('common.button.back')}
        acknowledgeText={t('common.button.understand')}
        onReject={closeSpeedbump}
        onAcknowledge={onClose}
      />
    )
  }

  return (
    <Modal isModalOpen isDismissible={false} name={ModalName.BackupReminder} backgroundColor="$surface1">
      <BackupReminderContent
        description={t('onboarding.home.intro.backup.description.extension')}
        layout="extension"
        onPressBackup={onPressBackup}
        onPressMaybeLater={openSpeedbump}
      />
    </Modal>
  )
}
