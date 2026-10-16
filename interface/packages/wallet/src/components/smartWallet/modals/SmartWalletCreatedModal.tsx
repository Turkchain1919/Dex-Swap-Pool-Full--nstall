import { SmartWallet } from '@universe/mycelium/icons/SmartWallet'
import { useSporeColors } from '@universe/mycelium/theme-hooks-compat'
import { useTranslation } from 'react-i18next'
import { UniswapHelpUrls } from 'uniswap/src/constants/urls'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { SmartWalletModal } from 'wallet/src/components/smartWallet/modals/SmartWalletModal'

interface SmartWalletCreatedModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SmartWalletCreatedModal({ isOpen, onClose }: SmartWalletCreatedModalProps): JSX.Element {
  const colors = useSporeColors()
  const { t } = useTranslation()
  return (
    <SmartWalletModal
      isOpen={isOpen}
      icon={<SmartWallet color={colors.accent1.val} size="$icon.24" />}
      iconBackgroundColor="$accent2"
      title={t('smartWallets.createdModal.title')}
      subtext={t('smartWallets.createdModal.description')}
      primaryButton={{ text: t('common.done'), onClick: onClose, variant: 'default', emphasis: 'secondary' }}
      learnMoreUrl={UniswapHelpUrls.articles.smartWalletDelegation}
      modalName={ModalName.SmartWalletCreatedModal}
      onClose={onClose}
    />
  )
}
