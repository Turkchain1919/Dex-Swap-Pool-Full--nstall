import { onlineManager } from '@tanstack/react-query'
import { act, waitFor } from '@testing-library/react-native'
import { BlockaidScanJsonRpcRequest, SharedQueryClient } from '@universe/api'
import { BlockaidApiClient } from 'uniswap/src/data/apiClients/blockaidApi/BlockaidApiClient'
import type { MockedFunction } from 'vitest'
import { useBlockaidJsonRpcScan } from 'wallet/src/features/dappRequests/hooks/useBlockaidJsonRpcScan'
import { renderHook } from 'wallet/src/test/test-utils'

vi.mock('uniswap/src/data/apiClients/blockaidApi/BlockaidApiClient', () => ({
  BlockaidApiClient: {
    scanJsonRpc: vi.fn(),
  },
}))

// The scan hook now emits a failure analytics event; stub it so the error-path tests don't hit the
// real analytics pipeline. Coverage of what it logs lives in useLogBlockaidScanFailure.test.ts.
vi.mock('uniswap/src/features/telemetry/send', () => ({
  sendAnalyticsEvent: vi.fn(),
  sendAppsFlyerEvent: vi.fn(),
}))

const mockScanJsonRpc = BlockaidApiClient.scanJsonRpc as MockedFunction<typeof BlockaidApiClient.scanJsonRpc>

const request: BlockaidScanJsonRpcRequest = {
  chain: 'ethereum',
  account_address: '0x1234567890123456789012345678901234567890',
  metadata: { domain: 'example.com' },
  data: {
    method: 'eth_signTypedData_v4',
    params: ['0x1234567890123456789012345678901234567890', '{"domain":{"chainId":1}}'],
  },
}

const sendCallsRequest: BlockaidScanJsonRpcRequest = {
  ...request,
  data: {
    method: 'wallet_sendCalls',
    params: [
      {
        version: '2.0.0',
        chainId: '0x1',
        from: request.account_address,
        calls: [{ to: '0x1234567890123456789012345678901234567890', value: '0x0', data: '0x' }],
      },
    ],
  },
}

const transactionRequest: BlockaidScanJsonRpcRequest = {
  ...request,
  data: {
    method: 'eth_sendTransaction',
    params: [
      {
        from: request.account_address,
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        data: '0x',
      },
    ],
  },
}

const successfulScan = {
  chain: 'ethereum',
  block: '12345',
  validation: {
    status: 'Success' as const,
    result_type: 'benign',
    description: 'Safe request',
    reason: 'No malicious activity detected',
    classification: 'safe',
    features: [],
  },
}

describe('useBlockaidJsonRpcScan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockScanJsonRpc.mockReset()
    SharedQueryClient.clear()
    onlineManager.setOnline(true)
  })

  afterEach(() => {
    onlineManager.setOnline(true)
  })

  it('returns a successful validation', async () => {
    mockScanJsonRpc.mockResolvedValue(successfulScan)

    const { result } = renderHook(() => useBlockaidJsonRpcScan(request))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.hasScanFailed).toBe(false)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.scanResult).toEqual(successfulScan)
    expect(result.current.hasScanFailed).toBe(false)
  })

  it.each([
    ['missing', undefined],
    ['unsuccessful', { status: 'Error' as const, error: 'execution reverted' }],
  ])('fails closed when wallet_sendCalls simulation is %s', async (_label, simulation) => {
    mockScanJsonRpc.mockResolvedValue({ ...successfulScan, simulation })

    const { result } = renderHook(() => useBlockaidJsonRpcScan(sendCallsRequest))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })

    expect(result.current.scanResult).toBeUndefined()
    // A simulation failure is request-shaped, so it is classified permanent (acknowledgement-gated).
    expect(result.current.isScanFailurePermanent).toBe(true)
  })

  it('accepts wallet_sendCalls only after successful simulation', async () => {
    const scanResult = {
      ...successfulScan,
      simulation: {
        status: 'Success' as const,
        assets_diffs: {},
        transaction_actions: [],
        total_usd_diff: {},
        exposures: {},
        total_usd_exposure: {},
        address_details: {},
        account_summary: { assets_diffs: [], traces: [], exposures: [], total_usd_exposure: {} },
      },
    }
    mockScanJsonRpc.mockResolvedValue(scanResult)

    const { result } = renderHook(() => useBlockaidJsonRpcScan(sendCallsRequest))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.scanResult).toEqual(scanResult)
    expect(result.current.hasScanFailed).toBe(false)
  })

  it('fails closed when another execution-style JSON-RPC method has no simulation', async () => {
    mockScanJsonRpc.mockResolvedValue(successfulScan)

    const { result } = renderHook(() => useBlockaidJsonRpcScan(transactionRequest))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })

    expect(result.current.scanResult).toBeUndefined()
    expect(result.current.isScanFailurePermanent).toBe(true)
  })

  it('reports a permanent failure when the scan is never attempted', () => {
    const { result } = renderHook(() => useBlockaidJsonRpcScan(null))

    // A scan that never ran yields no verdict, so consumers must treat it as failed rather than reading
    // TransactionRiskLevel.None out of a missing scan result. The un-buildable request is request-shaped,
    // so it is permanent (acknowledgement-gated), not an ungated blip.
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasScanFailed).toBe(true)
    expect(result.current.isScanFailurePermanent).toBe(true)
    expect(mockScanJsonRpc).not.toHaveBeenCalled()
  })

  it('fails closed when the initial scan is paused offline', async () => {
    onlineManager.setOnline(false)

    const { result, unmount } = renderHook(() => useBlockaidJsonRpcScan(request))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.scanResult).toBeUndefined()
    expect(mockScanJsonRpc).not.toHaveBeenCalled()

    unmount()
  })

  // Every resolved-but-unusable scan is request-shaped and recurs on retry, so all are permanent
  // (acknowledgement-gated) — an unknown error code is treated no differently from a known one.
  it.each([
    ['null result', null, true],
    ['missing validation', { chain: 'ethereum', block: '12345' }, true],
    [
      'validation rejected with an unknown error code',
      {
        chain: 'ethereum',
        block: '12345',
        validation: {
          status: 'Error' as const,
          result_type: 'error',
          description: 'Validation failed',
          reason: 'Upstream unavailable',
          features: [],
          error: 'internal_error',
        },
      },
      true,
    ],
    [
      'validation rejected with a known error code',
      {
        chain: 'ethereum',
        block: '12345',
        validation: {
          status: 'Error' as const,
          result_type: 'error',
          description: 'Validation failed',
          reason: 'Payload too large',
          features: [],
          error: 'request_too_large',
        },
      },
      true,
    ],
  ])('fails closed on a %s', async (_label, resultValue, isPermanent) => {
    mockScanJsonRpc.mockResolvedValue(resultValue)

    const { result } = renderHook(() => useBlockaidJsonRpcScan(request))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })

    expect(result.current.scanResult).toBeUndefined()
    expect(result.current.isScanFailurePermanent).toBe(isPermanent)
  })

  it('fails closed on an API rejection', async () => {
    mockScanJsonRpc.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useBlockaidJsonRpcScan(request))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })

    expect(result.current.isScanFailurePermanent).toBe(false)
  })

  it('keeps a permanent failure gated after a transient refetch failure', async () => {
    mockScanJsonRpc
      .mockResolvedValueOnce({
        chain: 'ethereum',
        block: '12345',
        validation: {
          status: 'Error',
          result_type: 'error',
          description: 'Validation failed',
          reason: 'Payload too large',
          features: [],
          error: 'request_too_large',
        },
      })
      .mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() => useBlockaidJsonRpcScan(request))

    await waitFor(() => {
      expect(result.current.isScanFailurePermanent).toBe(true)
    })
    await act(async () => {
      await SharedQueryClient.refetchQueries()
    })

    expect(mockScanJsonRpc).toHaveBeenCalledTimes(2)
    expect(result.current.hasScanFailed).toBe(true)
    expect(result.current.isScanFailurePermanent).toBe(true)
  })
})
