import { hashKey, useQuery } from '@tanstack/react-query'
import type { BlockaidScanJsonRpcRequest, BlockaidScanTransactionResponse } from '@universe/api'
import { BlockaidApiClient } from 'uniswap/src/data/apiClients/blockaidApi/BlockaidApiClient'
import type { BlockaidScanType } from 'uniswap/src/features/dappRequests/types'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'
import { useBlockaidScanFailureState } from 'wallet/src/features/dappRequests/hooks/useBlockaidScanFailureState'
import {
  BLOCKAID_SCAN_QUERY_OPTIONS,
  type BlockaidScanFailureState,
  getScanFailureState,
  requireUsableScan,
} from 'wallet/src/features/dappRequests/utils/blockaidScanQuery'

interface UseBlockaidJsonRpcScanResult extends BlockaidScanFailureState {
  scanResult?: BlockaidScanTransactionResponse
  isLoading: boolean
}

/**
 * Creates an efficient cache key from a JSON-RPC scan request.
 * @param request The JSON-RPC scan request or null
 * @returns An array of cache key components, or an array with null if request is null
 */
function createJsonRpcScanCacheKey(request: BlockaidScanJsonRpcRequest | null): unknown[] {
  if (!request) {
    return [null]
  }

  // Hash the params array to avoid storing large hex strings in cache keys
  const paramsHash = hashKey([request.data.params])

  return [request.chain, request.account_address, request.metadata.domain, request.data.method, paramsHash]
}

function getJsonRpcScanType(method: BlockaidScanJsonRpcRequest['data']['method'] | undefined): BlockaidScanType {
  switch (method) {
    case 'eth_sign':
    case 'personal_sign':
    case 'eth_signTypedData':
    case 'eth_signTypedData_v1':
    case 'eth_signTypedData_v2':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4':
      return 'signature'
    case 'wallet_sendCalls':
      return 'send-calls'
    default:
      // Any current or future execution-style JSON-RPC method must prove successful simulation.
      return 'transaction'
  }
}

/**
 * Hook to scan a signature or wallet_sendCalls request using Blockaid's JSON-RPC scan API
 * @param request The JSON-RPC scan request parameters
 * @returns Signature scan result and loading state
 */
export function useBlockaidJsonRpcScan(request: BlockaidScanJsonRpcRequest | null): UseBlockaidJsonRpcScanResult {
  const isScanEnabled = Boolean(request)
  // Signature scans have no execution simulation, while wallet_sendCalls previews and signing
  // depend on the simulated batch. Infer this here so callers cannot accidentally weaken the gate.
  const scanType = getJsonRpcScanType(request?.data.method)
  const queryKey = [ReactQueryCacheKey.BlockaidJsonRpcScan, ...createJsonRpcScanCacheKey(request)]
  const requestKey = hashKey(queryKey)

  const {
    data: scanResult,
    isLoading,
    isPaused,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => requireUsableScan({ scan: () => BlockaidApiClient.scanJsonRpc(request), scanType }),
    enabled: isScanEnabled,
    ...BLOCKAID_SCAN_QUERY_OPTIONS,
  })

  const failureState = useBlockaidScanFailureState({
    requestKey,
    failureState: getScanFailureState({ error, hasUsableScan: scanResult !== undefined, isScanEnabled, isPaused }),
    scanType,
    dappUrl: request?.metadata.domain,
    chain: request?.chain,
    requestMethod: request?.data.method,
    error,
  })

  return {
    scanResult,
    isLoading,
    ...failureState,
  }
}
