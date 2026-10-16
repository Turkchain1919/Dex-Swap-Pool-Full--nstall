import { Flex } from '@universe/mycelium'
import { ArrowDownToLine } from '@universe/mycelium/icons/ArrowDownToLine'
import { useTranslation } from 'react-i18next'
import { TransactionAssetList } from 'wallet/src/components/dappRequests/TransactionAssetList'
import type { TransactionAsset } from 'wallet/src/features/dappRequests/types'

interface TransactionWithdrawingSectionProps {
  assets: TransactionAsset[]
}

export function TransactionWithdrawingSection({ assets }: TransactionWithdrawingSectionProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <Flex gap="$spacing12" px="$spacing16">
      <TransactionAssetList
        assets={assets}
        icon={ArrowDownToLine}
        iconColor="$neutral2"
        iconRotation="180deg"
        titleText={t('transaction.status.withdraw.pending')}
        showUsdValue={true}
      />
    </Flex>
  )
}
