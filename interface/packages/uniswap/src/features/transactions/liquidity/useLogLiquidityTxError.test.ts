import { Code, ConnectError } from '@connectrpc/connect'
import { renderHook } from '@testing-library/react'
import { useLogLiquidityTxError } from 'uniswap/src/features/transactions/liquidity/useLogLiquidityTxError'
import { logger } from 'utilities/src/logger/logger'

// Shapes `parseErrorMessageTitle` actually resolves: the liquidity service returns either a
// ConnectError carrying a JSON payload, or the legacy `data.detail` structure.
const gasEstimateFailure = (): unknown => ({ data: { detail: 'FAILED_TO_ESTIMATE_GAS' } })

describe(useLogLiquidityTxError, () => {
  beforeEach(() => {
    vi.spyOn(logger, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs nothing while there is no error', () => {
    renderHook(() =>
      useLogLiquidityTxError({
        error: undefined,
        defaultTitle: 'unknown CreateLpPositionCalldataQuery',
        file: 'CreatePositionTxContext',
        functionName: 'useCreatePositionQuery',
      }),
    )

    expect(logger.error).not.toHaveBeenCalled()
  })

  // The regression this hook exists for: the callers' queries poll, so react-query returns a new
  // error object for the same failure every few seconds, and the previous render-body logging
  // emitted one RUM error event per re-render.
  it('logs once across re-renders of the same failure, even with a new error object', () => {
    const { rerender } = renderHook(
      ({ error }: { error: unknown }) =>
        useLogLiquidityTxError({
          error,
          defaultTitle: 'unknown CreateLpPositionCalldataQuery',
          file: 'CreatePositionTxContext',
          functionName: 'useCreatePositionQuery',
        }),
      { initialProps: { error: gasEstimateFailure() } },
    )

    rerender({ error: gasEstimateFailure() })
    rerender({ error: gasEstimateFailure() })

    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith('FAILED_TO_ESTIMATE_GAS', {
      tags: { file: 'CreatePositionTxContext', function: 'useCreatePositionQuery' },
    })
  })

  it('logs again when the failure changes', () => {
    const { rerender } = renderHook(
      ({ error }: { error: unknown }) =>
        useLogLiquidityTxError({
          error,
          defaultTitle: 'unknown CreateLpPositionCalldataQuery',
          file: 'CreatePositionTxContext',
          functionName: 'useCreatePositionQuery',
        }),
      { initialProps: { error: gasEstimateFailure() } },
    )

    rerender({ error: new ConnectError('BadRequest: {"name":"ResourceNotFound"}', Code.NotFound) })

    expect(logger.error).toHaveBeenCalledTimes(2)
    expect(logger.error).toHaveBeenLastCalledWith('ResourceNotFound', {
      tags: { file: 'CreatePositionTxContext', function: 'useCreatePositionQuery' },
    })
  })

  // The reset is what separates dedupe from suppression: a seen-message set (a `useRef`, a module
  // `Set`) would also pass every case above, but would silently swallow the recurrence below.
  it('logs again when the same failure returns after the error clears', () => {
    const { rerender } = renderHook(
      ({ error }: { error: unknown }) =>
        useLogLiquidityTxError({
          error,
          defaultTitle: 'unknown CreateLpPositionCalldataQuery',
          file: 'CreatePositionTxContext',
          functionName: 'useCreatePositionQuery',
        }),
      { initialProps: { error: gasEstimateFailure() } },
    )

    rerender({ error: undefined })
    rerender({ error: gasEstimateFailure() })

    expect(logger.error).toHaveBeenCalledTimes(2)
    expect(logger.error).toHaveBeenLastCalledWith('FAILED_TO_ESTIMATE_GAS', {
      tags: { file: 'CreatePositionTxContext', function: 'useCreatePositionQuery' },
    })
  })

  it('falls back to the default title when the error carries no parseable message', () => {
    renderHook(() =>
      useLogLiquidityTxError({
        error: { data: {} },
        defaultTitle: 'unknown CreateLpPositionCalldataQuery',
        file: 'CreatePositionTxContext',
        functionName: 'useCreatePositionQuery',
      }),
    )

    expect(logger.error).toHaveBeenCalledWith('unknown CreateLpPositionCalldataQuery', {
      tags: { file: 'CreatePositionTxContext', function: 'useCreatePositionQuery' },
    })
  })

  it('passes extra through to the log', () => {
    renderHook(() =>
      useLogLiquidityTxError({
        error: gasEstimateFailure(),
        defaultTitle: 'unknown IncreaseLpPositionCalldataQuery',
        file: 'IncreaseLiquidityTxContext',
        functionName: 'liquidityQueries.increasePosition',
        extra: { canBatchTransactions: false, delegatedAddress: null },
      }),
    )

    expect(logger.error).toHaveBeenCalledWith('FAILED_TO_ESTIMATE_GAS', {
      tags: { file: 'IncreaseLiquidityTxContext', function: 'liquidityQueries.increasePosition' },
      extra: { canBatchTransactions: false, delegatedAddress: null },
    })
  })

  it('fires onError once per distinct failure, alongside the log', () => {
    const onError = vi.fn()
    const { rerender } = renderHook(
      ({ error }: { error: unknown }) =>
        useLogLiquidityTxError({
          error,
          defaultTitle: 'DecreaseLpPositionCalldataQuery',
          file: 'RemoveLiquidityTxAndGasInfo',
          functionName: 'liquidityQueries.decreasePosition',
          onError,
        }),
      { initialProps: { error: gasEstimateFailure() } },
    )

    rerender({ error: gasEstimateFailure() })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith('FAILED_TO_ESTIMATE_GAS')
  })

  // Guards the omitted `extra`/`onError` effect dependencies: React runs the effect function
  // stored by the render that just committed, so both are read at fire time, never captured from
  // an earlier render.
  it('fires with the latest render extra and onError, not the render that last logged', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ error, extra, onError }: { error: unknown; extra: Record<string, unknown>; onError: (m: string) => void }) =>
        useLogLiquidityTxError({
          error,
          defaultTitle: 'unknown',
          file: 'CreatePositionTxContext',
          functionName: 'useCreatePositionQuery',
          extra,
          onError,
        }),
      { initialProps: { error: gasEstimateFailure(), extra: { amount: 'first' }, onError: first } },
    )

    rerender({
      error: new ConnectError('BadRequest: {"name":"ResourceNotFound"}', Code.NotFound),
      extra: { amount: 'second' },
      onError: second,
    })

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledWith('ResourceNotFound')
    expect(logger.error).toHaveBeenLastCalledWith('ResourceNotFound', {
      tags: { file: 'CreatePositionTxContext', function: 'useCreatePositionQuery' },
      extra: { amount: 'second' },
    })
  })

  it('does not re-fire when only the params change and the message is identical', () => {
    const onError = vi.fn()
    const { rerender } = renderHook(
      ({ extra }: { extra: Record<string, unknown> }) =>
        useLogLiquidityTxError({
          error: gasEstimateFailure(),
          defaultTitle: 'unknown',
          file: 'CreatePositionTxContext',
          functionName: 'useCreatePositionQuery',
          extra,
          onError,
        }),
      { initialProps: { extra: { amount: 'first' } } },
    )

    rerender({ extra: { amount: 'second' } })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith('FAILED_TO_ESTIMATE_GAS', {
      tags: { file: 'CreatePositionTxContext', function: 'useCreatePositionQuery' },
      extra: { amount: 'first' },
    })
  })
})
