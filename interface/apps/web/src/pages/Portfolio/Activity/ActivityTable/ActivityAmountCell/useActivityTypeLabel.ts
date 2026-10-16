import { useTranslation } from 'react-i18next'
import { TransactionDetails } from 'uniswap/src/features/transactions/types/transactionDetails'
import { getTransactionTypeLabel } from '~/pages/Portfolio/Activity/ActivityTable/ActivityAmountCell/utils'
import { ActivityCellVariant } from '~/pages/Portfolio/Activity/ActivityTable/activityTableModels'

/** CompactLayout-only
 * Full returns '' so we skip the fragment/filter lookup DualTokenLayout never shows.
 * */
export function useActivityTypeLabel({
  transaction,
  variant,
}: {
  transaction: TransactionDetails
  variant: ActivityCellVariant
}): string {
  const { t } = useTranslation()
  return variant === 'compact' ? getTransactionTypeLabel({ transaction, t }) : ''
}
