import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { navigate } from 'src/app/navigation/rootNavigation'
import { useReactNavigationModal } from 'src/components/modals/useReactNavigationModal'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { ImportType, OnboardingEntryPoint } from 'uniswap/src/types/onboarding'
import { MobileScreens, OnboardingScreens } from 'uniswap/src/types/screens/mobile'
import { BackupReminderContent } from 'wallet/src/components/backup/BackupReminderContent'
import { setBackupReminderLastSeenTs } from 'wallet/src/features/behaviorHistory/slice'

interface BackupReminderModalProps {
  /** Optional close handler provided by notification service renderer */
  onClose?: () => void
}

export function BackupReminderModal({ onClose: externalOnClose }: BackupReminderModalProps): JSX.Element {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const closedByButtonRef = useRef<boolean>(false)
  const { onClose: navigationOnClose } = useReactNavigationModal()
  const onClose = externalOnClose ?? navigationOnClose

  const checkForSwipeToDismiss = (): void => {
    onClose()
    if (!closedByButtonRef.current) {
      // Modal was swiped to dismiss, should open the BackupReminderWarning modal
      navigate(ModalName.BackupReminderWarning)
    }

    // Reset the ref and close the modal
    closedByButtonRef.current = false
  }

  const onPressMaybeLater = (): void => {
    closedByButtonRef.current = true
    dispatch(setBackupReminderLastSeenTs(Date.now()))
    onClose()
    navigate(ModalName.BackupReminderWarning)
  }

  const onPressBackup = (): void => {
    closedByButtonRef.current = true
    dispatch(setBackupReminderLastSeenTs(Date.now()))
    onClose()
    navigate(MobileScreens.OnboardingStack, {
      screen: OnboardingScreens.Backup,
      params: { importType: ImportType.BackupOnly, entryPoint: OnboardingEntryPoint.BackupCard },
    })
  }

  return (
    <Modal
      isModalOpen
      name={ModalName.BackupReminder}
      hideHandlebar={true}
      isDismissible={false}
      onClose={checkForSwipeToDismiss}
    >
      <BackupReminderContent
        description={t('onboarding.backup.reminder.warning.description')}
        layout="mobile"
        onPressBackup={onPressBackup}
        onPressMaybeLater={onPressMaybeLater}
      />
    </Modal>
  )
}
