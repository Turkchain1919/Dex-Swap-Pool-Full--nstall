import {
  getEarnPlanVaultTransactionInfoRows,
  getVaultTransactionInfoRows,
} from 'uniswap/src/components/activity/details/VaultTransactionInfoRows'
import { TransactionDetails } from 'uniswap/src/features/transactions/types/transactionDetails'
import { isPlanTransactionDetails } from 'uniswap/src/features/transactions/types/utils'

export function getActivityDisplayVaultRows({
  transactionDetails,
  typeInfo,
}: {
  transactionDetails: TransactionDetails
  typeInfo: TransactionDetails['typeInfo']
}): JSX.Element[] | undefined {
  if (isPlanTransactionDetails(transactionDetails) && transactionDetails.typeInfo.earnAction) {
    return getEarnPlanVaultTransactionInfoRows({
      typeInfo: transactionDetails.typeInfo,
    })
  }

  return getVaultTransactionInfoRows({
    transactionDetails,
    typeInfo,
  })
}
