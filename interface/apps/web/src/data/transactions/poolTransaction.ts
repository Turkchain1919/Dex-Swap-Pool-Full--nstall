import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { TransactionTokenSide, UniswapTransaction } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { TransactionEventType } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import type { UniverseChainId } from '@universe/chains'
import { isUniverseChainId } from 'uniswap/src/features/chains/utils'
import type { ParsedToken } from 'uniswap/src/features/dataApi/utils/parsedToken'

/** Event types a parsed row can carry — UNSPECIFIED rows are dropped by the parser. */
export type PoolTransactionEventType = Exclude<TransactionEventType, TransactionEventType.UNSPECIFIED>

/**
 * Canonical v2-native row for the Explore / PDP / TDP transaction tables, parsed from the
 * data-api v2 ListTransactions endpoint.
 *
 * Quantities are signed pool-perspective decimal strings — positive = the token entered the
 * pool (sold / deposited), negative = it left the pool (bought / withdrawn) — so consumers
 * may derive Buy/Sell from the sign.
 */
export interface PoolTransaction {
  id: string
  chainId: UniverseChainId
  eventType: PoolTransactionEventType
  /** Unix seconds */
  timestamp: number
  hash: string
  account: string
  token0: ParsedToken
  token1: ParsedToken
  token0Quantity: string
  token1Quantity: string
  usdValue: number
}

// Pool legs live on the pool's chain; the v2 payload's per-leg chainId is redundant with the row's.
// undefined = no token (vs. empty address = native currency)
function parseTokenSide(side: TransactionTokenSide | undefined, chainId: UniverseChainId): ParsedToken | undefined {
  const token = side?.token
  if (!token) {
    return undefined
  }
  return {
    chainId,
    address: token.address || undefined,
    symbol: token.symbol || undefined,
    name: token.name || undefined,
    // proto3 uint32 has no presence; 0 is indistinguishable from unset
    decimals: token.decimals || undefined,
    logoUrl: token.project?.logoUrl || undefined,
  }
}

/**
 * Parses a v2 ListTransactions row. Returns undefined for rows that can't be represented
 * (unknown chain, unspecified event type or protocol version, or either token side missing
 * a token entirely).
 */
export function parseUniswapTransaction(tx: UniswapTransaction, index: number): PoolTransaction | undefined {
  if (
    tx.eventType === TransactionEventType.UNSPECIFIED ||
    tx.protocolVersion === ProtocolVersion.UNSPECIFIED ||
    !isUniverseChainId(tx.chainId)
  ) {
    return undefined
  }
  const token0 = parseTokenSide(tx.token0, tx.chainId)
  const token1 = parseTokenSide(tx.token1, tx.chainId)
  if (!token0 || !token1) {
    return undefined
  }
  return {
    // index disambiguates multiple events per tx hash; stable only within one fetch
    id: `${tx.chainId}:${tx.txHash}:${tx.poolId}:${tx.eventType}:${index}`,
    chainId: tx.chainId,
    eventType: tx.eventType,
    timestamp: Number(tx.timestampMs / 1000n),
    hash: tx.txHash,
    account: tx.walletAddress,
    token0,
    token1,
    token0Quantity: tx.token0?.amount ?? '0',
    token1Quantity: tx.token1?.amount ?? '0',
    usdValue: tx.amountUsd,
  }
}
