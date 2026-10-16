import { Flex } from '@universe/mycelium'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { useActivityTokenAmount } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTokenAmount'
import { AMOUNT_COLUMN_WIDTH } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/utils'
import { ActivityAmountModel } from '~/pages/Portfolio/Activity/ActivityTable/activityTableModels'
import { NftAmountDisplay } from '~/pages/Portfolio/Activity/ActivityTable/NftAmountDisplay'

interface NftAmountCellProps {
  amount: Extract<ActivityAmountModel, { kind: 'nft' }>
}

export function NftAmountCell({ amount }: NftAmountCellProps): JSX.Element {
  const nftPurchaseCurrencyInfo = useCurrencyInfo(amount.purchaseCurrencyId)
  const purchase = useActivityTokenAmount({
    currencyInfo: nftPurchaseCurrencyInfo,
    amountRaw: amount.purchaseAmountRaw,
  })

  return (
    <Flex row alignItems="center" gap="$gap8" justifyContent="flex-start" minWidth={AMOUNT_COLUMN_WIDTH}>
      <NftAmountDisplay
        nftImageUrl={amount.nftImageUrl}
        nftName={amount.nftName}
        nftCollectionName={amount.nftCollectionName}
        purchaseAmountText={purchase.currencyInfo ? purchase.formattedAmount : null}
      />
    </Flex>
  )
}
