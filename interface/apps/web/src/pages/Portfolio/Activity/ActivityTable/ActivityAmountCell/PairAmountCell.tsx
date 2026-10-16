import { TradeType } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { TransactionDetails, TransactionType } from 'uniswap/src/features/transactions/types/transactionDetails'
import { isConfirmedSwapTypeInfo } from 'uniswap/src/features/transactions/types/utils'
import { EmptyCell } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/EmptyCell'
import { TokenAmountsCell } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/TokenAmountsCell'
import { useActivityTokenAmount } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTokenAmount'
import { useActivityTypeLabel } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTypeLabel'
import { ActivityAmountModel, ActivityCellVariant } from '~/pages/Portfolio/Activity/ActivityTable/activityTableModels'

interface PairAmountCellProps {
  transaction: TransactionDetails
  amount: Extract<ActivityAmountModel, { kind: 'pair' }>
  variant?: ActivityCellVariant
}

export function PairAmountCell({ transaction, amount, variant = 'full' }: PairAmountCellProps): JSX.Element {
  const inputCurrencyInfo = useCurrencyInfo(amount.inputCurrencyId)
  const outputCurrencyInfo = useCurrencyInfo(amount.outputCurrencyId)
  const typeLabel = useActivityTypeLabel({ transaction, variant })

  const swapPairApproximateFlags = useMemo(() => {
    if (transaction.typeInfo.type !== TransactionType.Swap) {
      return { input: false, output: false }
    }
    const confirmed = isConfirmedSwapTypeInfo(transaction.typeInfo)
    if (!confirmed) {
      const tradeType = transaction.typeInfo.tradeType
      return {
        input: tradeType === TradeType.EXACT_OUTPUT,
        output: tradeType === TradeType.EXACT_INPUT,
      }
    }
    return { input: false, output: false }
  }, [transaction.typeInfo])

  const input = useActivityTokenAmount({
    currencyInfo: inputCurrencyInfo,
    amountRaw: amount.inputAmountRaw,
    isApproximateAmount: swapPairApproximateFlags.input,
  })
  const output = useActivityTokenAmount({
    currencyInfo: outputCurrencyInfo,
    amountRaw: amount.outputAmountRaw,
    isApproximateAmount: swapPairApproximateFlags.output,
  })

  // Show the pair row if at least one side has currency metadata (matches modal / DualTokenLayout partial display)
  if (!inputCurrencyInfo && !outputCurrencyInfo) {
    return <EmptyCell />
  }

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
