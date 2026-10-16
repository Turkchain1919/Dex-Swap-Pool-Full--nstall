import { Plus } from '@universe/mycelium/icons/Plus'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { TransactionDetails } from 'uniswap/src/features/transactions/types/transactionDetails'
import { EmptyCell } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/EmptyCell'
import { TokenAmountsCell } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/TokenAmountsCell'
import { useActivityTokenAmount } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTokenAmount'
import { useActivityTypeLabel } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTypeLabel'
import { ActivityAmountModel, ActivityCellVariant } from '~/pages/Portfolio/Activity/ActivityTable/activityTableModels'

interface LiquidityPairAmountCellProps {
  transaction: TransactionDetails
  amount: Extract<ActivityAmountModel, { kind: 'liquidity-pair' }>
  variant?: ActivityCellVariant
}

export function LiquidityPairAmountCell({
  transaction,
  amount,
  variant = 'full',
}: LiquidityPairAmountCellProps): JSX.Element {
  const currency0Info = useCurrencyInfo(amount.currency0Id)
  const currency1Info = useCurrencyInfo(amount.currency1Id)
  const typeLabel = useActivityTypeLabel({ transaction, variant })

  const input = useActivityTokenAmount({
    currencyInfo: currency0Info,
    amountRaw: amount.currency0AmountRaw,
  })
  const output = useActivityTokenAmount({
    currencyInfo: currency1Info,
    amountRaw: amount.currency1AmountRaw,
  })

  if (!currency0Info || !currency1Info) {
    return <EmptyCell />
  }

  return (
    <TokenAmountsCell
      variant={variant}
      typeLabel={typeLabel}
      chainId={transaction.chainId}
      input={input}
      output={output}
      compactSeparator="&"
      fullSeparator={<Plus size={16} color="$neutral2" />}
    />
  )
}
