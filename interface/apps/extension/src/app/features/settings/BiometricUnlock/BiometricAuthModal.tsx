import { Button, Flex, Text } from '@universe/mycelium'
import type { GeneratedIcon } from '@universe/mycelium/icons'
import { HelpCenter } from '@universe/mycelium/icons/HelpCenter'
import { useSporeColors } from '@universe/mycelium/theme-hooks-compat'
import { useTranslation } from 'react-i18next'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { UniswapHelpUrls } from 'uniswap/src/constants/urls'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { useEvent } from 'utilities/src/react/hooks'

export function BiometricAuthModal({
  onClose,
  biometricMethodName,
  title,
  Icon,
}: {
  onClose: () => void
  biometricMethodName: string
  title: string
  Icon: GeneratedIcon
}): JSX.Element {
  const { t } = useTranslation()
  const colors = useSporeColors()

  const onPressGetHelp = useEvent((): void => {
    window.open(UniswapHelpUrls.articles.extensionBiometricsEnrollment, '_blank')
  })

  return (
    <Modal
      alignment="center"
      backgroundColor={colors.surface1.val}
      hideHandlebar={true}
      isDismissible={true}
      name={ModalName.WaitingForBiometricsEnrollment}
      onClose={onClose}
    >
      <Flex grow alignItems="flex-end">
        <Flex row>
          <Button icon={<HelpCenter />} size="xsmall" emphasis="tertiary" onPress={onPressGetHelp}>
            {t('common.getHelp.button')}
          </Button>
        </Flex>
      </Flex>

      <Flex centered gap="$spacing12">
        {/* Legacy Square's `size` variant maps one value onto width/height and their min/max twins. */}
        <Flex
          centered
          backgroundColor="$surface2"
          borderRadius="$rounded12"
          width="$spacing48"
          height="$spacing48"
          minWidth="$spacing48"
          maxWidth="$spacing48"
          minHeight="$spacing48"
          maxHeight="$spacing48"
        >
          <Icon color="$neutral1" size="$icon.24" />
        </Flex>

        <Flex centered gap="$spacing8">
          <Text textAlign="center" variant="subheading2">
            {title}
          </Text>

          <Text textAlign="center" variant="body3" color="$neutral2">
            {t('settings.setting.biometrics.extension.waitingForBiometricsModal.content', {
              biometricsMethod: biometricMethodName,
            })}
          </Text>
        </Flex>

        <Flex row width="100%" gap="$spacing12" mt="$spacing12">
          <Button size="medium" emphasis="secondary" onPress={onClose}>
            {t('common.button.cancel')}
          </Button>
        </Flex>
      </Flex>
    </Modal>
  )
}
