import { UniverseChainId } from '@universe/chains'
import { isBridge, isClassic, isWrap } from 'uniswap/src/features/transactions/swap/utils/routing'
import { TransactionDetails, TransactionStatus } from 'uniswap/src/features/transactions/types/transactionDetails'
import { ONE_MINUTE_MS } from 'utilities/src/time/time'
import { isFORTransaction } from 'wallet/src/features/transactions/utils'

// Local txs still Pending after these ages are ghost state and get cleared on watcher startup.
// The mainnet threshold must stay well above the Flashbots Protect inclusion window (max 25 blocks ≈ 5 min),
// so a cleared private-RPC tx can no longer be mined — clearing it only stops it from inflating the
// locally-derived nonce (getPendingPrivateTxCount); it can never cause a nonce to be reused or skipped.
export const MAINNET_STALE_LOCAL_TX_AGE_MS = 15 * ONE_MINUTE_MS
export const DEFAULT_STALE_LOCAL_TX_AGE_MS = 5 * ONE_MINUTE_MS

// Nonce safety for private-RPC txs is a property of the relay (inclusion window), not the chain,
// so they get a chain-independent floor. Deliberately its own constant rather than an alias of the
// mainnet value: lowering a per-chain threshold must never lower this floor.
export const PRIVATE_RPC_STALE_LOCAL_TX_FLOOR_MS = 15 * ONE_MINUTE_MS

export function getStaleLocalTxAgeMs({
  chainId,
  submitViaPrivateRpc,
}: {
  chainId: UniverseChainId
  submitViaPrivateRpc?: boolean
}): number {
  const perChainThreshold =
    chainId === UniverseChainId.Mainnet ? MAINNET_STALE_LOCAL_TX_AGE_MS : DEFAULT_STALE_LOCAL_TX_AGE_MS
  return submitViaPrivateRpc ? Math.max(perChainThreshold, PRIVATE_RPC_STALE_LOCAL_TX_FLOOR_MS) : perChainThreshold
}

/**
 * Whether a local transaction is a stale Pending entry that should be cleared instead of watched.
 * Only plain on-chain EVM txs (classic/bridge/wrap) qualify — UniswapX orders, plans, Solana and
 * FOR txs have their own lifecycles and watchers.
 */
export function isStaleLocalPendingTransaction(transaction: TransactionDetails): boolean {
  if (transaction.status !== TransactionStatus.Pending) {
    return false
  }
  if (isFORTransaction(transaction)) {
    return false
  }
  if (!isClassic(transaction) && !isBridge(transaction) && !isWrap(transaction)) {
    return false
  }
  // A bridge stays Pending with sendConfirmed after its source-chain receipt while the destination
  // side settles — the watcher resumes waitForBridgingStatus for it on restart, so it's in flight
  // cross-chain, not ghost state. Only bridges whose send was never confirmed are sweepable.
  if (isBridge(transaction) && transaction.sendConfirmed) {
    return false
  }
  return (
    Date.now() - transaction.addedTime >
    getStaleLocalTxAgeMs({
      chainId: transaction.chainId,
      submitViaPrivateRpc: transaction.options.submitViaPrivateRpc,
    })
  )
}

function isPendingPrivateRpcTransaction(transaction: TransactionDetails): boolean {
  if (transaction.status !== TransactionStatus.Pending) {
    return false
  }
  if (!isClassic(transaction) && !isBridge(transaction) && !isWrap(transaction)) {
    return false
  }
  return Boolean(transaction.options.submitViaPrivateRpc)
}

function privateQueueKey(transaction: TransactionDetails): string {
  return `${transaction.from}-${transaction.chainId}`
}

/**
 * Selects the stale local Pending txs that are safe to clear.
 *
 * Private-RPC txs clear all-or-nothing per (address, chainId) queue: the locally-derived nonce
 * (getPendingPrivateTxCount) counts the whole queue, so clearing only its stale members would leave
 * the derived nonce pointing at a hole and wedge new submissions with nonce-too-high. If any private
 * tx in a queue is still fresh, none of that queue's private txs are cleared this round — they get
 * another chance once the whole queue is past its threshold. Public txs are unaffected by this
 * grouping and clear individually.
 */
export function getClearableStaleTransactions(transactions: TransactionDetails[]): TransactionDetails[] {
  const queuesWithFreshPrivateTx = new Set<string>()
  for (const transaction of transactions) {
    if (isPendingPrivateRpcTransaction(transaction) && !isStaleLocalPendingTransaction(transaction)) {
      queuesWithFreshPrivateTx.add(privateQueueKey(transaction))
    }
  }
  return transactions.filter((transaction) => {
    if (!isStaleLocalPendingTransaction(transaction)) {
      return false
    }
    return !(isPendingPrivateRpcTransaction(transaction) && queuesWithFreshPrivateTx.has(privateQueueKey(transaction)))
  })
}
