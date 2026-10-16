// New helper for adapting ethers or viem receipts to the shared TransactionReceipt type
import { UniverseChainId } from '@universe/chains'
import { providers } from 'ethers/lib/ethers'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { ValueType } from 'uniswap/src/features/tokens/getCurrencyAmount'
import {
  TransactionNetworkFee,
  TransactionReceipt as SharedTransactionReceipt,
} from 'uniswap/src/features/transactions/types/transactionDetails'
import { formatEther, TransactionReceipt as ViemTransactionReceipt } from 'viem'
import { ZksyncTransactionReceipt } from 'viem/chains'

type ViemTransactionReceiptOrZksyncReceipt = ViemTransactionReceipt | ZksyncTransactionReceipt

// Helper to normalize bigint / BigNumber / number to a JS number
const toNumber = (value: unknown): number => {
  if (value == null) {
    return 0
  }
  if (typeof value === 'bigint') {
    return Number(value)
  }
  if (typeof value === 'number') {
    return value
  }
  // oxlint-disable-next-line typescript/no-unnecessary-condition
  if (typeof value === 'object' && value !== null && 'toNumber' in (value as Record<string, unknown>)) {
    try {
      return (value as { toNumber: () => number }).toNumber()
    } catch {
      /* fall through */
    }
  }
  return Number(value)
}

/**
 * Adapt an ethers.js TransactionReceipt to the shared receipt shape.
 */
export function receiptFromEthersReceipt(
  ethersReceipt: providers.TransactionReceipt | undefined,
  confirmedTime?: number,
): SharedTransactionReceipt | undefined {
  if (!ethersReceipt) {
    return undefined
  }

  return {
    blockHash: ethersReceipt.blockHash,
    blockNumber: toNumber(ethersReceipt.blockNumber),
    transactionIndex: toNumber(ethersReceipt.transactionIndex),
    confirmedTime: confirmedTime ?? Date.now(),
    gasUsed: toNumber(ethersReceipt.gasUsed),
    effectiveGasPrice: toNumber(ethersReceipt.effectiveGasPrice),
  }
}

/**
 * Adapt a viem‐style TransactionReceipt (returned by wagmi/publicClient) to the
 * shared receipt shape.
 * The viem receipt already uses plain numbers & bigint, so we just normalize.
 */
export function receiptFromViemReceipt(
  viemReceipt: ViemTransactionReceiptOrZksyncReceipt | undefined,
  confirmedTime?: number,
): SharedTransactionReceipt | undefined {
  if (!viemReceipt) {
    return undefined
  }

  return {
    blockHash: viemReceipt.blockHash,
    blockNumber: toNumber(viemReceipt.blockNumber),
    transactionIndex: toNumber(viemReceipt.transactionIndex),
    confirmedTime: confirmedTime ?? Date.now(),
    gasUsed: toNumber(viemReceipt.gasUsed),
    effectiveGasPrice: toNumber(viemReceipt.effectiveGasPrice),
  }
}

/**
 * Builds the network fee paid for a mined transaction from its viem receipt, denominated in the
 * chain's native currency. Mirrors the wallet-side `buildNetworkFeeFromReceipt` (packages/wallet),
 * which does the same math on an ethers receipt.
 * Returns undefined when the RPC omitted `effectiveGasPrice` (viem types it as required, but some
 * RPCs leave it out) — callers skip the fee rather than break finalization.
 */
export function buildNetworkFeeFromViemReceipt({
  receipt,
  chainId,
}: {
  receipt: ViemTransactionReceiptOrZksyncReceipt
  chainId: UniverseChainId
}): TransactionNetworkFee | undefined {
  const gasUsed = receipt.gasUsed as bigint | undefined
  const effectiveGasPrice = receipt.effectiveGasPrice as bigint | undefined
  if (typeof gasUsed !== 'bigint' || typeof effectiveGasPrice !== 'bigint') {
    return undefined
  }

  const { nativeCurrency } = getChainInfo(chainId)
  return {
    quantity: formatEther(gasUsed * effectiveGasPrice),
    tokenSymbol: nativeCurrency.symbol,
    tokenAddress: nativeCurrency.address,
    chainId,
    valueType: ValueType.Exact,
  }
}
