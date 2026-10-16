import { useStickyBlockaidScanFailureState } from 'wallet/src/features/dappRequests/hooks/useStickyBlockaidScanFailureState'
import type { BlockaidScanFailureState } from 'wallet/src/features/dappRequests/utils/blockaidScanQuery'
import { renderHook } from 'wallet/src/test/test-utils'

const PERMANENT_FAILURE: BlockaidScanFailureState = {
  hasScanFailed: true,
  isScanFailurePermanent: true,
}
const TRANSIENT_FAILURE: BlockaidScanFailureState = {
  hasScanFailed: true,
  isScanFailurePermanent: false,
}
const USABLE_SCAN: BlockaidScanFailureState = {
  hasScanFailed: false,
  isScanFailurePermanent: false,
}

describe('useStickyBlockaidScanFailureState', () => {
  it('keeps a permanent failure gated after the same request transitions to a transient failure', () => {
    const { result, rerender } = renderHook(useStickyBlockaidScanFailureState, {
      initialProps: [{ requestKey: 'request-a', failureState: PERMANENT_FAILURE }],
    })

    rerender([{ requestKey: 'request-a', failureState: TRANSIENT_FAILURE }])

    expect(result.current).toEqual({ hasScanFailed: true, isScanFailurePermanent: true })
  })

  it('does not carry permanence into a different request', () => {
    const { result, rerender } = renderHook(useStickyBlockaidScanFailureState, {
      initialProps: [{ requestKey: 'request-a', failureState: PERMANENT_FAILURE }],
    })

    rerender([{ requestKey: 'request-b', failureState: TRANSIENT_FAILURE }])

    expect(result.current).toEqual(TRANSIENT_FAILURE)
  })

  it('remembers each permanently failed request when keys change within one mount', () => {
    const { result, rerender } = renderHook(useStickyBlockaidScanFailureState, {
      initialProps: [{ requestKey: 'request-a', failureState: PERMANENT_FAILURE }],
    })

    rerender([{ requestKey: 'request-b', failureState: PERMANENT_FAILURE }])
    rerender([{ requestKey: 'request-a', failureState: TRANSIENT_FAILURE }])

    expect(result.current).toEqual(PERMANENT_FAILURE)
  })

  it('lets a usable scan supersede a previous failure for the same request', () => {
    const { result, rerender } = renderHook(useStickyBlockaidScanFailureState, {
      initialProps: [{ requestKey: 'request-a', failureState: PERMANENT_FAILURE }],
    })

    rerender([{ requestKey: 'request-a', failureState: USABLE_SCAN }])

    expect(result.current).toEqual(USABLE_SCAN)
  })
})
