import { useEffect } from 'react'
import { parseErrorMessageTitle } from 'uniswap/src/features/transactions/liquidity/utils'
import { logger } from 'utilities/src/logger/logger'

/**
 * Reports one liquidity approval/calldata query failure to Datadog exactly once.
 *
 * The effect is keyed on the parsed message string rather than on the error object, because the
 * callers' queries poll (`refetchInterval: 5 * ONE_SECOND_MS`, `retry: false`) and react-query
 * hands back a fresh Error instance on every refetch of the same failure — an object-keyed effect
 * would re-fire on each poll. Keyed on the message, a persistent failure logs once and a
 * genuinely different failure logs again.
 */
export function useLogLiquidityTxError(params: {
  error: unknown
  /** Fallback title when the error carries no parseable message. */
  defaultTitle: string
  /** Datadog `@context.tags.file` value — the LP monitors filter on it. */
  file: string
  functionName: string
  /** Attached as Datadog `extra`, read from the render in which the message changed. */
  extra?: Record<string, unknown>
  /** Fired alongside the log, once per distinct message. */
  onError?: (message: string) => void
}): void {
  const { error, defaultTitle, file, functionName, extra, onError } = params

  const message = error ? parseErrorMessageTitle(error, { defaultTitle }) : undefined

  useEffect(() => {
    if (!message) {
      return
    }

    logger.error(message, {
      tags: { file, function: functionName },
      ...(extra ? { extra } : {}),
    })

    onError?.(message)
    // `extra` and `onError` are deliberately not dependencies: both are rebuilt on every render,
    // and including them would restore the per-render re-logging this hook exists to remove.
    // They cannot go stale at fire time — React runs the effect stored by the render that just
    // committed, so both are read from the render in which `message` changed. The only effect of
    // omitting them is that a params change leaving the message identical produces no second
    // event, which is the dedupe doing its job.
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- dedupe is keyed on `message` only
  }, [message, file, functionName])
}
