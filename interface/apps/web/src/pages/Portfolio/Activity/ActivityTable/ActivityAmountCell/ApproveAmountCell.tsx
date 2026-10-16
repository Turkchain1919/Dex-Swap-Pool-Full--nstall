import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatApprovalAmount } from 'uniswap/src/components/activity/utils'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { TransactionDetails } from 'uniswap/src/features/transactions/types/transactionDetails'
import { getSymbolDisplayText } from 'uniswap/src/utils/currency'
import { CompactLayout } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/CompactLayout'
import { DualTokenLayout } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/DualTokenLayout'
import { useActivityTypeLabel } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/useActivityTypeLabel'
import { createTokenLogo } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/utils'
import { ActivityAmountModel, ActivityCellVariant } from '~/pages/Portfolio/Activity/ActivityTable/activityTableModels'

interface ApproveAmountCellProps {
  transaction: TransactionDetails
  amount: Extract<ActivityAmountModel, { kind: 'approve' }>
  variant?: ActivityCellVariant
}

function ApproveAmountCellInner({ transaction, amount, variant = 'full' }: ApproveAmountCellProps): JSX.Element {
  const { t } = useTranslation()
  const formatter = useLocalizationContext()
  const singleCurrencyInfo = useCurrencyInfo(amount.currencyId)
  const typeLabel = useActivityTypeLabel({ transaction, variant })
  const approvalAmount = amount.approvalAmount

  const { formattedAmount, compactAmountText } = useMemo(() => {
    if (!singleCurrencyInfo || approvalAmount === undefined) {
      return { formattedAmount: null, compactAmountText: null }
    }

    const amountText = formatApprovalAmount({
      approvalAmount,
      formatNumberOrString: formatter.formatNumberOrString,
      t,
    })

    const formatted = `${amountText ? amountText + ' ' : ''}${getSymbolDisplayText(singleCurrencyInfo.currency.symbol) ?? ''}`

    const symbol = getSymbolDisplayText(singleCurrencyInfo.currency.symbol) ?? ''
    const compact = amountText ? `${amountText} ${symbol}` : symbol ? symbol : null

    return { formattedAmount: formatted, compactAmountText: compact }
  }, [singleCurrencyInfo, approvalAmount, formatter, t])

  if (variant === 'compact') {
    return (
      <CompactLayout typeLabel={typeLabel} logo={createTokenLogo(singleCurrencyInfo)} amountText={compactAmountText} />
    )
  }

  return (
    <DualTokenLayout
      inputCurrency={singleCurrencyInfo}
      outputCurrency={null}
      inputFormattedAmount={formattedAmount}
      outputFormattedAmount={null}
      inputUsdValue={null}
      outputUsdValue={null}
      separator={null}
    />
  )
}

export const ApproveAmountCell = memo(ApproveAmountCellInner)
