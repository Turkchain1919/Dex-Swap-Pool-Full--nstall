import { TradingApi } from '@universe/api'
import { UniverseChainId } from '@universe/chains'
import { TransactionDetails, TransactionStatus } from 'uniswap/src/features/transactions/types/transactionDetails'
import { fiatPurchaseTransactionInfo, transactionDetails, uniswapXOrderDetails } from 'uniswap/src/test/fixtures'
import { ONE_MINUTE_MS } from 'utilities/src/time/time'
import {
  DEFAULT_STALE_LOCAL_TX_AGE_MS,
  getClearableStaleTransactions,
  getStaleLocalTxAgeMs,
  isStaleLocalPendingTransaction,
  MAINNET_STALE_LOCAL_TX_AGE_MS,
  PRIVATE_RPC_STALE_LOCAL_TX_FLOOR_MS,
} from 'wallet/src/features/transactions/watcher/staleTransactionCleanup'

const NOW_MS = 1_700_000_000_000
const OWNER_ADDRESS = '0x000000000000000000000000000000000000000a'

function pendingClassicTx({
  chainId,
  ageMs,
  submitViaPrivateRpc = false,
  from = OWNER_ADDRESS,
}: {
  chainId: UniverseChainId
  ageMs: number
  submitViaPrivateRpc?: boolean
  from?: string
}): TransactionDetails {
  return transactionDetails({
    chainId,
    from,
    status: TransactionStatus.Pending,
    addedTime: NOW_MS - ageMs,
    options: { request: {}, submitViaPrivateRpc },
  })
}

describe(getStaleLocalTxAgeMs, () => {
  it('uses 15 minutes for mainnet', () => {
    expect(getStaleLocalTxAgeMs({ chainId: UniverseChainId.Mainnet })).toBe(15 * ONE_MINUTE_MS)
    expect(getStaleLocalTxAgeMs({ chainId: UniverseChainId.Mainnet })).toBe(MAINNET_STALE_LOCAL_TX_AGE_MS)
  })

  it('uses 5 minutes for all other chains', () => {
    expect(getStaleLocalTxAgeMs({ chainId: UniverseChainId.Base })).toBe(5 * ONE_MINUTE_MS)
    expect(getStaleLocalTxAgeMs({ chainId: UniverseChainId.ArbitrumOne })).toBe(DEFAULT_STALE_LOCAL_TX_AGE_MS)
  })

  it('applies a chain-independent floor to private-RPC txs', () => {
    expect(getStaleLocalTxAgeMs({ chainId: UniverseChainId.Base, submitViaPrivateRpc: true })).toBe(
      PRIVATE_RPC_STALE_LOCAL_TX_FLOOR_MS,
    )
    expect(getStaleLocalTxAgeMs({ chainId: UniverseChainId.Mainnet, submitViaPrivateRpc: true })).toBe(
      MAINNET_STALE_LOCAL_TX_AGE_MS,
    )
  })
})

describe(isStaleLocalPendingTransaction, () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW_MS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clears a mainnet pending tx older than 15 minutes', () => {
    const transaction = pendingClassicTx({ chainId: UniverseChainId.Mainnet, ageMs: 16 * ONE_MINUTE_MS })
    expect(isStaleLocalPendingTransaction(transaction)).toBe(true)
  })

  it('keeps a mainnet pending tx at or under 15 minutes', () => {
    const recent = pendingClassicTx({ chainId: UniverseChainId.Mainnet, ageMs: 14 * ONE_MINUTE_MS })
    const boundary = pendingClassicTx({ chainId: UniverseChainId.Mainnet, ageMs: 15 * ONE_MINUTE_MS })
    expect(isStaleLocalPendingTransaction(recent)).toBe(false)
    expect(isStaleLocalPendingTransaction(boundary)).toBe(false)
  })

  it('clears a non-mainnet pending tx older than 5 minutes', () => {
    const stale = pendingClassicTx({ chainId: UniverseChainId.Base, ageMs: 6 * ONE_MINUTE_MS })
    const recent = pendingClassicTx({ chainId: UniverseChainId.Base, ageMs: 4 * ONE_MINUTE_MS })
    expect(isStaleLocalPendingTransaction(stale)).toBe(true)
    expect(isStaleLocalPendingTransaction(recent)).toBe(false)
  })

  it('clears a stale bridge tx whose send was never confirmed', () => {
    const transaction = {
      ...pendingClassicTx({ chainId: UniverseChainId.Base, ageMs: 6 * ONE_MINUTE_MS }),
      routing: TradingApi.Routing.BRIDGE,
    } as TransactionDetails
    expect(isStaleLocalPendingTransaction(transaction)).toBe(true)
  })

  it('never clears a source-confirmed bridge — it stays Pending while the destination side settles', () => {
    const transaction = {
      ...pendingClassicTx({ chainId: UniverseChainId.Base, ageMs: 60 * ONE_MINUTE_MS }),
      routing: TradingApi.Routing.BRIDGE,
      sendConfirmed: true,
    } as TransactionDetails
    expect(isStaleLocalPendingTransaction(transaction)).toBe(false)
  })

  it('never clears non-pending statuses', () => {
    for (const status of [
      TransactionStatus.Success,
      TransactionStatus.Failed,
      TransactionStatus.Cancelling,
      TransactionStatus.Replacing,
    ]) {
      const transaction = {
        ...pendingClassicTx({ chainId: UniverseChainId.Mainnet, ageMs: 60 * ONE_MINUTE_MS }),
        status,
      } as TransactionDetails
      expect(isStaleLocalPendingTransaction(transaction)).toBe(false)
    }
  })

  it('never clears UniswapX orders — they have their own expiry lifecycle', () => {
    const transaction = uniswapXOrderDetails({
      status: TransactionStatus.Pending,
      addedTime: NOW_MS - 60 * ONE_MINUTE_MS,
    })
    expect(isStaleLocalPendingTransaction(transaction)).toBe(false)
  })

  it('never clears chained plan transactions — the plan watcher owns their recovery', () => {
    const transaction = {
      ...pendingClassicTx({ chainId: UniverseChainId.Mainnet, ageMs: 60 * ONE_MINUTE_MS }),
      routing: TradingApi.Routing.CHAINED,
    } as TransactionDetails
    expect(isStaleLocalPendingTransaction(transaction)).toBe(false)
  })

  it('never clears FOR transactions — off-chain purchases can legitimately take longer', () => {
    const transaction = transactionDetails({
      chainId: UniverseChainId.Mainnet,
      status: TransactionStatus.Pending,
      addedTime: NOW_MS - 60 * ONE_MINUTE_MS,
      typeInfo: fiatPurchaseTransactionInfo(),
    })
    expect(isStaleLocalPendingTransaction(transaction)).toBe(false)
  })

  describe('nonce safety', () => {
    // A Pending private-RPC tx is added to the on-chain pending count when deriving the next nonce
    // (getPendingPrivateTxCount). Clearing must only happen once the tx is past the Flashbots
    // inclusion window (max ~5 min), so the nonce it claimed can safely be reused.
    it('keeps a private-RPC mainnet tx that may still be included by Flashbots', () => {
      const transaction = pendingClassicTx({
        chainId: UniverseChainId.Mainnet,
        ageMs: 10 * ONE_MINUTE_MS,
        submitViaPrivateRpc: true,
      })
      expect(isStaleLocalPendingTransaction(transaction)).toBe(false)
    })

    it('clears a private-RPC mainnet tx once it is unminable, so it stops inflating future nonces', () => {
      const transaction = pendingClassicTx({
        chainId: UniverseChainId.Mainnet,
        ageMs: 16 * ONE_MINUTE_MS,
        submitViaPrivateRpc: true,
      })
      expect(isStaleLocalPendingTransaction(transaction)).toBe(true)
    })

    it('keeps a private-RPC tx on a non-mainnet chain past the per-chain threshold but under the floor', () => {
      const transaction = pendingClassicTx({
        chainId: UniverseChainId.Base,
        ageMs: 10 * ONE_MINUTE_MS,
        submitViaPrivateRpc: true,
      })
      expect(isStaleLocalPendingTransaction(transaction)).toBe(false)
    })

    it('clears a private-RPC tx on a non-mainnet chain once it is past the floor', () => {
      const transaction = pendingClassicTx({
        chainId: UniverseChainId.Base,
        ageMs: 16 * ONE_MINUTE_MS,
        submitViaPrivateRpc: true,
      })
      expect(isStaleLocalPendingTransaction(transaction)).toBe(true)
    })
  })
})

describe(getClearableStaleTransactions, () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW_MS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps a whole private-RPC queue when its ages straddle the threshold', () => {
    // Clearing only the 20-min tx would leave the queue-derived nonce pointing at a hole.
    const stalePrivateTx = pendingClassicTx({
      chainId: UniverseChainId.Mainnet,
      ageMs: 20 * ONE_MINUTE_MS,
      submitViaPrivateRpc: true,
    })
    const freshPrivateTx = pendingClassicTx({
      chainId: UniverseChainId.Mainnet,
      ageMs: 6 * ONE_MINUTE_MS,
      submitViaPrivateRpc: true,
    })
    expect(getClearableStaleTransactions([stalePrivateTx, freshPrivateTx])).toEqual([])
  })

  it('clears a private-RPC queue whole once every member is past the threshold', () => {
    const olderPrivateTx = pendingClassicTx({
      chainId: UniverseChainId.Mainnet,
      ageMs: 20 * ONE_MINUTE_MS,
      submitViaPrivateRpc: true,
    })
    const newerPrivateTx = pendingClassicTx({
      chainId: UniverseChainId.Mainnet,
      ageMs: 16 * ONE_MINUTE_MS,
      submitViaPrivateRpc: true,
    })
    expect(getClearableStaleTransactions([olderPrivateTx, newerPrivateTx])).toEqual([olderPrivateTx, newerPrivateTx])
  })

  it('scopes the all-or-nothing rule to the (address, chainId) queue', () => {
    const stalePrivateTx = pendingClassicTx({
      chainId: UniverseChainId.Mainnet,
      ageMs: 20 * ONE_MINUTE_MS,
      submitViaPrivateRpc: true,
    })
    const freshPrivateTxOtherChain = pendingClassicTx({
      chainId: UniverseChainId.Base,
      ageMs: 6 * ONE_MINUTE_MS,
      submitViaPrivateRpc: true,
    })
    const freshPrivateTxOtherAddress = pendingClassicTx({
      chainId: UniverseChainId.Mainnet,
      ageMs: 6 * ONE_MINUTE_MS,
      submitViaPrivateRpc: true,
      from: '0x000000000000000000000000000000000000000b',
    })
    expect(
      getClearableStaleTransactions([stalePrivateTx, freshPrivateTxOtherChain, freshPrivateTxOtherAddress]),
    ).toEqual([stalePrivateTx])
  })

  it('clears stale public txs individually even when the private queue is held back', () => {
    const stalePublicTx = pendingClassicTx({ chainId: UniverseChainId.Mainnet, ageMs: 20 * ONE_MINUTE_MS })
    const stalePrivateTx = pendingClassicTx({
      chainId: UniverseChainId.Mainnet,
      ageMs: 20 * ONE_MINUTE_MS,
      submitViaPrivateRpc: true,
    })
    const freshPrivateTx = pendingClassicTx({
      chainId: UniverseChainId.Mainnet,
      ageMs: 6 * ONE_MINUTE_MS,
      submitViaPrivateRpc: true,
    })
    expect(getClearableStaleTransactions([stalePublicTx, stalePrivateTx, freshPrivateTx])).toEqual([stalePublicTx])
  })

  it('matches the per-tx predicate when there is no private queue interaction', () => {
    const staleTx = pendingClassicTx({ chainId: UniverseChainId.Mainnet, ageMs: 16 * ONE_MINUTE_MS })
    const freshTx = pendingClassicTx({ chainId: UniverseChainId.Mainnet, ageMs: 14 * ONE_MINUTE_MS })
    expect(getClearableStaleTransactions([staleTx, freshTx])).toEqual([staleTx])
  })
})
