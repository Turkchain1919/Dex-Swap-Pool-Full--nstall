import { Button, Flex, iconSizes, Text } from '@universe/mycelium'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWalletLabelField } from 'src/app/features/accounts/useWalletLabelField'
import { WalletLabelInput } from 'src/app/features/accounts/WalletLabelInput'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { AccountIcon } from 'uniswap/src/features/accounts/AccountIcon'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { shortenAddress } from 'utilities/src/addresses'
import { SignerMnemonicAccount } from 'wallet/src/features/wallet/accounts/types'

type CreateWalletModalProps = {
  isOpen: boolean
  pendingWallet?: SignerMnemonicAccount
  onCancel: () => void
  onConfirm: (walletLabel: string) => void
}

// Expects a pending account to be created before opening this modal
export function CreateWalletModal({
  isOpen,
  pendingWallet,
  onCancel,
  onConfirm,
}: CreateWalletModalProps): JSX.Element | null {
  const { t } = useTranslation()
  const { value, setValue, error } = useWalletLabelField()

  const nextDerivationIndex = pendingWallet?.derivationIndex
  const onboardingAccountAddress = pendingWallet?.address

  useEffect(() => {
    if (isOpen) {
      setValue('')
    }
  }, [isOpen, setValue])

  const onPressConfirm = useCallback(() => {
    onConfirm(value)
  }, [onConfirm, value])

  const placeholderText = nextDerivationIndex
    ? t('account.wallet.create.placeholder', { index: nextDerivationIndex + 1 })
    : ''

  return (
    <Modal isModalOpen={isOpen} name={ModalName.AccountEditLabel} onClose={onCancel}>
      <Flex centered fill borderRadius="$rounded16" gap="$spacing24" mt="$spacing16">
        <Flex centered gap="$spacing12" width="100%">
          {onboardingAccountAddress && <AccountIcon address={onboardingAccountAddress} size={iconSizes.icon48} />}
          <WalletLabelInput value={value} error={error} placeholder={placeholderText} onChangeText={setValue} />
          {onboardingAccountAddress && (
            <Text color="$neutral3" variant="body3">
              {shortenAddress({ address: onboardingAccountAddress })}
            </Text>
          )}
        </Flex>

        <Flex row alignSelf="stretch" gap="$spacing12">
          <Button size="small" emphasis="secondary" onPress={onCancel}>
            {t('common.button.cancel')}
          </Button>
          <Button
            variant="branded"
            emphasis="secondary"
            size="small"
            disabled={Boolean(error)}
            onPress={onPressConfirm}
          >
            {t('common.button.create')}
          </Button>
        </Flex>
      </Flex>
    </Modal>
  )
}
