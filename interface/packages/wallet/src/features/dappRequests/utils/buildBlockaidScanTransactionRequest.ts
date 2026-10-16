import { type BlockaidScanTransactionRequest } from '@universe/api'
import type { UniverseChainId } from '@universe/chains'
import type { EthTransaction } from 'uniswap/src/types/walletConnect'
import { hexlifyTransaction } from 'utilities/src/transactions/hexlifyTransaction'

interface TransactionRequestData {
  chainId: UniverseChainId
  account: string
  transaction: EthTransaction
  dappUrl: string
}

/**
 * Builds a Blockaid scan request from transaction request data
 * @param request Transaction request data from WalletConnect or dapp request
 * @returns Blockaid scan transaction request
 */
export function buildBlockaidScanTransactionRequest(request: TransactionRequestData): BlockaidScanTransactionRequest {
  const { transaction, chainId, account, dappUrl } = request
  // Gas fields and nonce are assigned by the wallet before signing, so including values supplied
  // by the dapp would let Blockaid simulate a transaction different from the one we execute.
  const canonicalTransaction = hexlifyTransaction({
    to: transaction.to,
    value: transaction.value,
    data: transaction.data,
  })

  return {
    chain: chainId.toString(),
    account_address: account,
    metadata: {
      domain: dappUrl,
    },
    data: {
      // The wallet signs with `account`; never let a dapp-supplied `from` change simulation semantics.
      from: account,
      to: canonicalTransaction.to,
      value: canonicalTransaction.value,
      data: canonicalTransaction.data,
    },
    options: ['validation', 'simulation'],
  }
}
