import { onlineManager } from '@tanstack/react-query'
import { act, waitFor } from '@testing-library/react-native'
import { BlockaidScanTransactionRequest, SharedQueryClient } from '@universe/api'
import { BlockaidApiClient } from 'uniswap/src/data/apiClients/blockaidApi/BlockaidApiClient'
import type { MockedFunction } from 'vitest'
import { useBlockaidTransactionScan } from 'wallet/src/features/dappRequests/hooks/useBlockaidTransactionScan'
import { renderHook } from 'wallet/src/test/test-utils'

// Mock the BlockaidApiClient
vi.mock('uniswap/src/data/apiClients/blockaidApi/BlockaidApiClient', () => ({
  BlockaidApiClient: {
    scanTransaction: vi.fn(),
  },
}))

// The scan hook now emits a failure analytics event; stub it so the error-path tests don't hit the
// real analytics pipeline. Coverage of what it logs lives in useLogBlockaidScanFailure.test.ts.
vi.mock('uniswap/src/features/telemetry/send', () => ({
  sendAnalyticsEvent: vi.fn(),
  sendAppsFlyerEvent: vi.fn(),
}))

const mockScanTransaction = BlockaidApiClient.scanTransaction as MockedFunction<
  typeof BlockaidApiClient.scanTransaction
>

describe('useBlockaidTransactionScan', () => {
  const createMockRequest = (overrides?: Partial<BlockaidScanTransactionRequest>): BlockaidScanTransactionRequest => ({
    chain: 'ethereum',
    account_address: '0x1234567890123456789012345678901234567890',
    metadata: {
      domain: 'example.com',
    },
    data: {
      to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      data: '0x095ea7b3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ff',
      value: '0x0',
      from: '0x1234567890123456789012345678901234567890',
      nonce: '0x1',
    },
    ...overrides,
  })

  const mockScanResult = {
    chain: 'ethereum',
    block: '12345',
    validation: {
      status: 'Success' as const,
      result_type: 'benign',
      description: 'Safe transaction',
      reason: 'No malicious activity detected',
      classification: 'safe',
      features: [],
    },
    simulation: {
      status: 'Success' as const,
      assets_diffs: {},
      transaction_actions: [],
      total_usd_diff: {},
      exposures: {},
      total_usd_exposure: {},
      address_details: {},
      account_summary: {
        assets_diffs: [],
        traces: [],
        exposures: [],
        total_usd_exposure: {},
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockScanTransaction.mockReset()
    // Clear the query cache to ensure test isolation
    SharedQueryClient.clear()
    onlineManager.setOnline(true)
  })

  afterEach(() => {
    onlineManager.setOnline(true)
  })

  it('should return loading state initially', () => {
    mockScanTransaction.mockResolvedValue(mockScanResult)
    const request = createMockRequest()

    const { result } = renderHook(() => useBlockaidTransactionScan(request))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.scanResult).toBeUndefined()
    expect(result.current.hasScanFailed).toBe(false)
  })

  it('should fetch and return scan result when request is provided', async () => {
    mockScanTransaction.mockResolvedValue(mockScanResult)
    const request = createMockRequest()

    const { result } = renderHook(() => useBlockaidTransactionScan(request))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.scanResult).toEqual(mockScanResult)
    expect(result.current.hasScanFailed).toBe(false)
    expect(mockScanTransaction).toHaveBeenCalledWith(request)
    expect(mockScanTransaction).toHaveBeenCalledTimes(1)
  })

  it('keeps the cached verdict when a background refetch fails', async () => {
    mockScanTransaction.mockResolvedValueOnce(mockScanResult).mockRejectedValueOnce(new Error('API Error'))
    const request = createMockRequest()

    const { result } = renderHook(() => useBlockaidTransactionScan(request))

    await waitFor(() => {
      expect(result.current.scanResult).toEqual(mockScanResult)
    })
    await act(async () => {
      await SharedQueryClient.refetchQueries()
    })

    expect(mockScanTransaction).toHaveBeenCalledTimes(2)
    expect(result.current.scanResult).toEqual(mockScanResult)
    expect(result.current.hasScanFailed).toBe(false)
    expect(result.current.isScanFailurePermanent).toBe(false)
  })

  // A scan that never ran yields no verdict, so it has to read as failed rather than as
  // TransactionRiskLevel.None parsed out of a missing scan result.
  it('should not fetch, and should fail closed, when request is null', () => {
    const { result } = renderHook(() => useBlockaidTransactionScan(null))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.scanResult).toBeUndefined()
    expect(result.current.hasScanFailed).toBe(true)
    expect(mockScanTransaction).not.toHaveBeenCalled()
  })

  it('should fail closed when the initial scan is paused offline', async () => {
    onlineManager.setOnline(false)
    const request = createMockRequest()

    const { result, unmount } = renderHook(() => useBlockaidTransactionScan(request))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.scanResult).toBeUndefined()
    expect(mockScanTransaction).not.toHaveBeenCalled()

    unmount()
  })

  it('should fail closed on an API rejection', async () => {
    mockScanTransaction.mockRejectedValue(new Error('API Error'))
    const request = createMockRequest()

    const { result } = renderHook(() => useBlockaidTransactionScan(request))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })

    expect(result.current.scanResult).toBeUndefined()
  })

  it('should fail closed when the API client returns null', async () => {
    mockScanTransaction.mockResolvedValue(null)
    const request = createMockRequest()

    const { result } = renderHook(() => useBlockaidTransactionScan(request))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })

    expect(result.current.scanResult).toBeUndefined()
  })

  it('should fail closed when validation is missing', async () => {
    mockScanTransaction.mockResolvedValue({ chain: 'ethereum', block: '12345' })
    const request = createMockRequest()

    const { result } = renderHook(() => useBlockaidTransactionScan(request))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })
  })

  it('should fail closed when Blockaid validation has an error status', async () => {
    mockScanTransaction.mockResolvedValue({
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
    const request = createMockRequest()

    const { result } = renderHook(() => useBlockaidTransactionScan(request))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })

    // request_too_large is deterministic, so the UI must not tell the user retrying will help.
    expect(result.current.isScanFailurePermanent).toBe(true)
  })

  it('keeps a permanent failure gated after a transient refetch failure', async () => {
    mockScanTransaction
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
    const request = createMockRequest()

    const { result } = renderHook(() => useBlockaidTransactionScan(request))

    await waitFor(() => {
      expect(result.current.isScanFailurePermanent).toBe(true)
    })
    await act(async () => {
      await SharedQueryClient.refetchQueries()
    })

    expect(mockScanTransaction).toHaveBeenCalledTimes(2)
    expect(result.current.hasScanFailed).toBe(true)
    expect(result.current.isScanFailurePermanent).toBe(true)
  })

  it.each([
    ['missing', undefined],
    ['unsuccessful', { status: 'Error' as const, error: 'out_of_gas' }],
  ])('should fail closed when transaction simulation is %s', async (_label, simulation) => {
    mockScanTransaction.mockResolvedValue({
      ...mockScanResult,
      simulation,
    })
    const request = createMockRequest()

    const { result } = renderHook(() => useBlockaidTransactionScan(request))

    await waitFor(() => {
      expect(result.current.hasScanFailed).toBe(true)
    })

    expect(result.current.scanResult).toBeUndefined()
    // A simulation failure is request-shaped, so it is classified permanent (acknowledgement-gated).
    expect(result.current.isScanFailurePermanent).toBe(true)
  })

  describe('cache key optimization', () => {
    it('should use the same cache for identical transaction data (hashed efficiently)', async () => {
      mockScanTransaction.mockResolvedValue(mockScanResult)

      const request1 = createMockRequest({
        data: {
          to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          // Large hex data should be hashed efficiently
          data: '0x095ea7b3' + '0'.repeat(1000),
          value: '0x0',
          from: '0x1234567890123456789012345678901234567890',
        },
      })
      const request2 = createMockRequest({
        data: {
          to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          // Same large hex data - hash should match
          data: '0x095ea7b3' + '0'.repeat(1000),
          value: '0x0',
          from: '0x1234567890123456789012345678901234567890',
        },
      })

      // Render first hook
      const { result: result1 } = renderHook(() => useBlockaidTransactionScan(request1))

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
      })

      expect(mockScanTransaction).toHaveBeenCalledTimes(1)

      // Render second hook with identical data - should use cache
      const { result: result2 } = renderHook(() => useBlockaidTransactionScan(request2))

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false)
      })

      // Should not call API again due to cache hit
      expect(mockScanTransaction).toHaveBeenCalledTimes(1)
      expect(result2.current.scanResult).toEqual(mockScanResult)
    })

    it('should use different cache for different transaction data', async () => {
      mockScanTransaction.mockResolvedValue(mockScanResult)

      const request1 = createMockRequest({
        data: {
          to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          data: '0x095ea7b3',
        },
      })

      const request2 = createMockRequest({
        data: {
          to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          data: '0x12345678', // Different data
        },
      })

      // Render first hook
      const { result: result1 } = renderHook(() => useBlockaidTransactionScan(request1))

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
      })

      expect(mockScanTransaction).toHaveBeenCalledTimes(1)

      // Render second hook with different data - should NOT use cache
      const { result: result2 } = renderHook(() => useBlockaidTransactionScan(request2))

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false)
      })

      // Should call API again for different transaction data
      expect(mockScanTransaction).toHaveBeenCalledTimes(2)
    })

    it('should use different cache for different chains', async () => {
      mockScanTransaction.mockResolvedValue(mockScanResult)

      const request1 = createMockRequest({ chain: 'ethereum' })
      const request2 = createMockRequest({ chain: 'polygon' })

      // Render first hook
      const { result: result1 } = renderHook(() => useBlockaidTransactionScan(request1))

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
      })

      expect(mockScanTransaction).toHaveBeenCalledTimes(1)

      // Render second hook with different chain - should NOT use cache
      const { result: result2 } = renderHook(() => useBlockaidTransactionScan(request2))

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false)
      })

      // Should call API again for different chain
      expect(mockScanTransaction).toHaveBeenCalledTimes(2)
    })

    it('should use different cache for different account addresses', async () => {
      mockScanTransaction.mockResolvedValue(mockScanResult)

      const request1 = createMockRequest({ account_address: '0x1111111111111111111111111111111111111111' })
      const request2 = createMockRequest({ account_address: '0x2222222222222222222222222222222222222222' })

      // Render first hook
      const { result: result1 } = renderHook(() => useBlockaidTransactionScan(request1))

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
      })

      expect(mockScanTransaction).toHaveBeenCalledTimes(1)

      // Render second hook with different account - should NOT use cache
      const { result: result2 } = renderHook(() => useBlockaidTransactionScan(request2))

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false)
      })

      // Should call API again for different account
      expect(mockScanTransaction).toHaveBeenCalledTimes(2)
    })

    it('should use different cache for different dapp domains', async () => {
      mockScanTransaction.mockResolvedValue(mockScanResult)

      const request1 = createMockRequest({ metadata: { domain: 'example.com' } })
      const request2 = createMockRequest({ metadata: { domain: 'malicious.com' } })

      // Render first hook
      const { result: result1 } = renderHook(() => useBlockaidTransactionScan(request1))

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
      })

      expect(mockScanTransaction).toHaveBeenCalledTimes(1)

      // Render second hook with different domain - should NOT use cache
      const { result: result2 } = renderHook(() => useBlockaidTransactionScan(request2))

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false)
      })

      // Should call API again for different domain
      expect(mockScanTransaction).toHaveBeenCalledTimes(2)
    })
  })
})
