import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { TransactionDetails } from 'uniswap/src/features/transactions/types/transactionDetails'
import { TokenAmountsCell } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/TokenAmountsCell'
import { useActivityTokenAmount } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTokenAmount'
import { useActivityTypeLabel } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTypeLabel'
import { ActivityAmountModel, ActivityCellVariant } from '~/pages/Portfolio/Activity/ActivityTable/activityTableModels'

interface SingleAmountCellProps {
  transaction: TransactionDetails
  amount: Extract<ActivityAmountModel, { kind: 'single' }>
  variant?: ActivityCellVariant
}

export function SingleAmountCell({ transaction, amount, variant = 'full' }: SingleAmountCellProps): JSX.Element {
  const singleCurrencyInfo = useCurrencyInfo(amount.currencyId)
  const typeLabel = useActivityTypeLabel({ transaction, variant })
  const input = useActivityTokenAmount({
    currencyInfo: singleCurrencyInfo,
    amountRaw: amount.amountRaw,
  })

  return <TokenAmountsCell variant={variant} typeLabel={typeLabel} chainId={transaction.chainId} input={input} />
}
