import { useNativeCurrencyInfo, useWrappedNativeCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { TransactionDetails } from 'uniswap/src/features/transactions/types/transactionDetails'
import { TokenAmountsCell } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/TokenAmountsCell'
import { useActivityTokenAmount } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTokenAmount'
import { useActivityTypeLabel } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTypeLabel'
import { ActivityAmountModel, ActivityCellVariant } from '~/pages/Portfolio/Activity/ActivityTable/activityTableModels'

interface WrapAmountCellProps {
  transaction: TransactionDetails
  amount: Extract<ActivityAmountModel, { kind: 'wrap' }>
  variant?: ActivityCellVariant
}

export function WrapAmountCell({ transaction, amount, variant = 'full' }: WrapAmountCellProps): JSX.Element {
  const nativeCurrencyInfo = useNativeCurrencyInfo(transaction.chainId)
  const wrappedCurrencyInfo = useWrappedNativeCurrencyInfo(transaction.chainId)
  const typeLabel = useActivityTypeLabel({ transaction, variant })

  const wrapInputCurrency = amount.unwrapped ? wrappedCurrencyInfo : nativeCurrencyInfo
  const wrapOutputCurrency = amount.unwrapped ? nativeCurrencyInfo : wrappedCurrencyInfo

  const input = useActivityTokenAmount({
    currencyInfo: wrapInputCurrency,
    amountRaw: amount.amountRaw,
  })
  const output = useActivityTokenAmount({
    currencyInfo: wrapOutputCurrency,
    amountRaw: amount.amountRaw,
  })

  return (
    <TokenAmountsCell
      variant={variant}
      typeLabel={typeLabel}
      chainId={transaction.chainId}
      input={input}
      output={output}
    />
  )
}
