import { WalletEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import type { MockedFunction } from 'vitest'
import { useLogBlockaidScanFailure } from 'wallet/src/features/dappRequests/hooks/useLogBlockaidScanFailure'
import { BlockaidScanUnusableError } from 'wallet/src/features/dappRequests/utils/blockaidScanQuery'
import { renderHook } from 'wallet/src/test/test-utils'

vi.mock('uniswap/src/features/telemetry/send', () => ({
  sendAnalyticsEvent: vi.fn(),
}))

const mockSendAnalyticsEvent = sendAnalyticsEvent as MockedFunction<typeof sendAnalyticsEvent>

describe('useLogBlockaidScanFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not log when there is no scan failure', () => {
    renderHook(() =>
      useLogBlockaidScanFailure({
        requestKey: 'request-a',
        scanType: 'transaction',
        dappUrl: 'app.dapp.fun',
        chain: 'ethereum',
        error: null,
      }),
    )

    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('logs the dapp, cause, and classification for a permanent validation failure', () => {
    const error = new BlockaidScanUnusableError({
      reason: 'request_too_large',
      isPermanent: true,
      failureKind: 'validation',
    })

    renderHook(() =>
      useLogBlockaidScanFailure({
        requestKey: 'request-a',
        scanType: 'transaction',
        dappUrl: 'app.dapp.fun',
        chain: 'ethereum',
        error,
      }),
    )

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(WalletEventName.DappRequestScanFailed, {
      dapp_url: 'app.dapp.fun',
      chain: 'ethereum',
      scan_type: 'transaction',
      failure_kind: 'validation',
      is_permanent: true,
      reason: 'request_too_large',
      request_method: undefined,
    })
  })

  it('classifies a transient transport failure and carries the request method', () => {
    const error = new BlockaidScanUnusableError({
      reason: 'transport_error',
      isPermanent: false,
      failureKind: 'transport',
    })

    renderHook(() =>
      useLogBlockaidScanFailure({
        requestKey: 'request-a',
        scanType: 'signature',
        dappUrl: 'x.example',
        chain: 'ethereum',
        requestMethod: 'personal_sign',
        error,
      }),
    )

    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      WalletEventName.DappRequestScanFailed,
      expect.objectContaining({
        scan_type: 'signature',
        failure_kind: 'transport',
        is_permanent: false,
        reason: 'transport_error',
        request_method: 'personal_sign',
      }),
    )
  })

  it('fails closed for a non-Blockaid error and reports the same permanent classification as the UI', () => {
    renderHook(() =>
      useLogBlockaidScanFailure({
        requestKey: 'request-a',
        scanType: 'send-calls',
        dappUrl: 'x.example',
        chain: 'ethereum',
        error: new Error('boom'),
      }),
    )

    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      WalletEventName.DappRequestScanFailed,
      expect.objectContaining({
        scan_type: 'send-calls',
        failure_kind: 'unknown',
        is_permanent: true,
        reason: 'unknown',
      }),
    )
  })

  it('logs repeated transient failures only once for the same request key', () => {
    const firstError = new BlockaidScanUnusableError({
      reason: 'transport_error',
      isPermanent: false,
      failureKind: 'transport',
    })
    const secondError = new BlockaidScanUnusableError({
      reason: 'transport_error',
      isPermanent: false,
      failureKind: 'transport',
    })
    const { rerender } = renderHook(
      (error: Error | null) =>
        useLogBlockaidScanFailure({
          requestKey: 'request-a',
          scanType: 'transaction',
          dappUrl: 'x.example',
          chain: 'ethereum',
          error,
        }),
      { initialProps: [firstError] },
    )

    // React Query clears the error while refetching, then installs a new Error if that attempt fails.
    rerender([null])
    rerender([secondError])

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
  })

  it('logs a permanent failure when it supersedes a transient failure for the same request key', () => {
    const transientError = new BlockaidScanUnusableError({
      reason: 'transport_error',
      isPermanent: false,
      failureKind: 'transport',
    })
    const permanentError = new BlockaidScanUnusableError({
      reason: 'request_too_large',
      isPermanent: true,
      failureKind: 'validation',
    })
    const { rerender } = renderHook(
      (error: Error | null) =>
        useLogBlockaidScanFailure({
          requestKey: 'request-a',
          scanType: 'transaction',
          dappUrl: 'x.example',
          chain: 'ethereum',
          error,
        }),
      { initialProps: [transientError] },
    )

    rerender([null])
    rerender([permanentError])

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(2)
    expect(mockSendAnalyticsEvent).toHaveBeenLastCalledWith(
      WalletEventName.DappRequestScanFailed,
      expect.objectContaining({
        failure_kind: 'validation',
        is_permanent: true,
        reason: 'request_too_large',
      }),
    )
  })

  it('logs failures independently when the request key changes within one mount', () => {
    const error = new BlockaidScanUnusableError({
      reason: 'transport_error',
      isPermanent: false,
      failureKind: 'transport',
    })
    const { rerender } = renderHook(
      ({ requestKey, error }: { requestKey: string; error: Error | null }) =>
        useLogBlockaidScanFailure({
          requestKey,
          scanType: 'transaction',
          dappUrl: 'x.example',
          chain: 'ethereum',
          error,
        }),
      { initialProps: [{ requestKey: 'request-a', error }] },
    )

    rerender([{ requestKey: 'request-b', error }])

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(2)
  })

  it('does not downgrade or re-log after a permanent failure for the same request key', () => {
    const permanentError = new BlockaidScanUnusableError({
      reason: 'request_too_large',
      isPermanent: true,
      failureKind: 'validation',
    })
    const transientError = new BlockaidScanUnusableError({
      reason: 'transport_error',
      isPermanent: false,
      failureKind: 'transport',
    })
    const { rerender } = renderHook(
      (error: Error | null) =>
        useLogBlockaidScanFailure({
          requestKey: 'request-a',
          scanType: 'transaction',
          dappUrl: 'x.example',
          chain: 'ethereum',
          error,
        }),
      { initialProps: [permanentError] },
    )

    rerender([null])
    rerender([transientError])

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      WalletEventName.DappRequestScanFailed,
      expect.objectContaining({
        failure_kind: 'validation',
        is_permanent: true,
        reason: 'request_too_large',
      }),
    )
  })
})
