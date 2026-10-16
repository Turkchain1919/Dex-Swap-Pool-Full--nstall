import { RevokeApproveFields, TransactionStepType } from 'uniswap/src/features/transactions/steps/types'
import { ValidatedTransactionRequest } from 'uniswap/src/features/transactions/types/transactionRequests'
import { parseERC20ApproveCalldata } from 'uniswap/src/utils/approvals'

export interface TokenRevocationTransactionStep extends RevokeApproveFields {
  type: TransactionStepType.TokenRevocationTransaction
}

export function createRevocationTransactionStep({
  txRequest,
  tokenAddress,
  chainId,
}: {
  txRequest: ValidatedTransactionRequest | undefined
  // Optional to match the `!tokenAddress` guard below, and the sibling approval step creator:
  // a native currency has no token address to revoke (and none to wrap on Arc/Tempo).
  tokenAddress: TokenRevocationTransactionStep['tokenAddress'] | undefined
  chainId: TokenRevocationTransactionStep['chainId']
}): TokenRevocationTransactionStep | undefined {
  if (!txRequest?.data || !tokenAddress) {
    return undefined
  }

  const type = TransactionStepType.TokenRevocationTransaction
  const { spender, amount } = parseERC20ApproveCalldata(txRequest.data.toString())

  if (amount !== BigInt(0)) {
    return undefined
  }

  return { type, txRequest, tokenAddress, spender, amount: '0', chainId }
}
