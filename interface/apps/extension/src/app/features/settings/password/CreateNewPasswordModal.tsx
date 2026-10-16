import { Flex, Text } from '@universe/mycelium'
import { Lock } from '@universe/mycelium/icons/Lock'
import { useTranslation } from 'react-i18next'
import { ChangePasswordForm } from 'src/app/features/settings/password/ChangePasswordForm'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { ModalName } from 'uniswap/src/features/telemetry/constants'

export function CreateNewPasswordModal({
  isOpen,
  oldPassword,
  onNext,
  onClose,
}: {
  isOpen: boolean
  oldPassword: string | undefined
  onNext: (password: string) => void
  onClose: () => void
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <Modal
      alignment="center"
      backgroundColor="$surface1"
      hideHandlebar={true}
      isDismissible={true}
      isModalOpen={isOpen}
      name={ModalName.CreateNewPassword}
      onClose={onClose}
    >
      <Flex centered gap="$spacing16" pt="$spacing20">
        <Flex
          alignItems="center"
          justifyContent="center"
          backgroundColor="$surface2"
          borderRadius="$rounded12"
          height="$spacing48"
          width="$spacing48"
        >
          <Lock color="$neutral1" size="$icon.24" />
        </Flex>

        <Text py="$spacing4" textAlign="center" variant="subheading2">
          {t('settings.setting.password.change.title')}
        </Text>

        <ChangePasswordForm oldPassword={oldPassword} onNext={onNext} />
      </Flex>
    </Modal>
  )
}
