import { isExtensionApp } from '@universe/environment'
import { Flex, Text } from '@universe/mycelium'
import { useTranslation } from 'react-i18next'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { PortfolioBalanceSettingsContent } from 'uniswap/src/features/settings/balances/PortfolioBalanceSettingsContent'
import { ModalName } from 'uniswap/src/features/telemetry/constants'

type PortfolioBalanceModalProps = {
  isOpen: boolean
  onClose: () => void
}

export type PortfolioBalanceModalState = Omit<PortfolioBalanceModalProps, 'onClose' | 'isOpen'>

export function PortfolioBalanceModal({ isOpen, onClose }: PortfolioBalanceModalProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <Modal isModalOpen={isOpen} name={ModalName.PortfolioBalanceModal} onClose={onClose}>
      <Flex
        gap="$spacing16"
        pb={isExtensionApp ? undefined : '$spacing24'}
        py={isExtensionApp ? '$spacing16' : undefined}
        px="$spacing12"
        width="100%"
      >
        <Flex centered>
          <Text color="$neutral1" variant="subheading1">
            {t('settings.setting.balancesActivity.title')}
          </Text>
        </Flex>
        <PortfolioBalanceSettingsContent />
      </Flex>
    </Modal>
  )
}
