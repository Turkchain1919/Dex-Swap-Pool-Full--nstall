import { Flex } from '@universe/mycelium'
import { SendAlt } from '@universe/mycelium/icons/SendAlt'
import { useTranslation } from 'react-i18next'
import { TransactionAssetList } from 'wallet/src/components/dappRequests/TransactionAssetList'
import { type TransactionAsset, TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'

interface TransactionSendingSectionProps {
  assets: TransactionAsset[]
  riskLevel?: TransactionRiskLevel
}

export function TransactionSendingSection({ assets }: TransactionSendingSectionProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <Flex gap="$spacing12" px="$spacing16">
      <TransactionAssetList
        assets={assets}
        icon={SendAlt}
        iconColor="$neutral2"
        titleText={t('walletConnect.request.details.label.sending')}
        showUsdValue={true}
      />
    </Flex>
  )
}
