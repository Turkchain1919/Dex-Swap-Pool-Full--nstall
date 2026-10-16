import { SagaIterator } from 'redux-saga'
import { call, select } from 'typed-redux-saga'
import { makeSelectAddressTransactions } from 'uniswap/src/features/transactions/selectors'
import { isClassic } from 'uniswap/src/features/transactions/swap/utils/routing'
import { TransactionStatus } from 'uniswap/src/features/transactions/types/transactionDetails'

export interface CalculatedNonce {
  nonce: number
  pendingPrivateTxCount?: number
}

export function* getPendingPrivateTxCount(address: Address, chainId: number): SagaIterator<number> {
  const selectAddressTransactions = yield* call(makeSelectAddressTransactions)
  const pendingTransactions = yield* select(selectAddressTransactions, { evmAddress: address, svmAddress: null })
  if (!pendingTransactions) {
    return 0
  }

  return pendingTransactions.filter(
    (tx) =>
      tx.chainId === chainId &&
      tx.status === TransactionStatus.Pending &&
      isClassic(tx) &&
      Boolean(tx.options.submitViaPrivateRpc) &&
      tx.hash,
  ).length
}
