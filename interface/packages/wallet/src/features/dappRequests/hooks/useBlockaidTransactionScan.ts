import { hashKey, useQuery } from '@tanstack/react-query'
import { BlockaidScanTransactionRequest, BlockaidScanTransactionResponse } from '@universe/api'
import { BlockaidApiClient } from 'uniswap/src/data/apiClients/blockaidApi/BlockaidApiClient'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'
import { useBlockaidScanFailureState } from 'wallet/src/features/dappRequests/hooks/useBlockaidScanFailureState'
import {
  BLOCKAID_SCAN_QUERY_OPTIONS,
  type BlockaidScanFailureState,
  getScanFailureState,
  requireUsableScan,
} from 'wallet/src/features/dappRequests/utils/blockaidScanQuery'

interface UseBlockaidTransactionScanResult extends BlockaidScanFailureState {
  scanResult?: BlockaidScanTransactionResponse
  isLoading: boolean
}

/**
 * Creates an efficient cache key from a transaction scan request.
 * @param request The transaction scan request or null
 * @returns An array of cache key components, or an array with null if request is null
 */
function createTransactionScanCacheKey(request: BlockaidScanTransactionRequest | null): unknown[] {
  if (!request) {
    return [null]
  }

  // Hash the transaction data object to avoid storing large hex strings in cache keys
  const dataHash = hashKey([request.data])

  return [request.chain, request.account_address, request.metadata.domain, dataHash]
}

/**
 * Hook to scan a transaction using Blockaid's API
 * @param request The transaction scan request parameters
 * @returns Transaction scan result and loading state
 */
export function useBlockaidTransactionScan(
  request: BlockaidScanTransactionRequest | null,
): UseBlockaidTransactionScanResult {
  const isScanEnabled = Boolean(request)
  const queryKey = [ReactQueryCacheKey.BlockaidTransactionScan, ...createTransactionScanCacheKey(request)]
  const requestKey = hashKey(queryKey)

  const {
    data: scanResult,
    isLoading,
    isPaused,
    error,
  } = useQuery({
    queryKey,
    queryFn: () =>
      requireUsableScan({ scan: () => BlockaidApiClient.scanTransaction(request), scanType: 'transaction' }),
    enabled: isScanEnabled,
    ...BLOCKAID_SCAN_QUERY_OPTIONS,
  })

  const failureState = useBlockaidScanFailureState({
    requestKey,
    failureState: getScanFailureState({ error, hasUsableScan: scanResult !== undefined, isScanEnabled, isPaused }),
    scanType: 'transaction',
    dappUrl: request?.metadata.domain,
    chain: request?.chain,
    error,
  })

  return {
    scanResult,
    isLoading,
    ...failureState,
  }
}
