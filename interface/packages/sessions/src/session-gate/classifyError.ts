import { Code, ConnectError } from '@connectrpc/connect'
import { SessionReadyTimeoutError, SessionRecoveryFailedError } from '@universe/sessions/src/session-gate/errors'
import { SessionError } from '@universe/sessions/src/session-initialization/sessionErrors'

/**
 * HTTP statuses the entry-gateway returns when a request needs a (re)established
 * or upgraded session — each is worth one `recover()` + retry through the gate:
 *   401 unauthenticated → a session exists but its auth_score is too low
 *   403 forbidden       → no valid session yet (e.g. the cold-start race, before
 *                         the session cookie is attached)
 * Both are recoverable: `recover()` re-initializes the session and the retry
 * carries the freshly-established/upgraded session. The gate retries once, so a
 * genuinely-terminal 403 (e.g. a hard WAF/geo block) costs at most one extra call.
 */
export function isSessionAuthFailureStatus(status: number | undefined): boolean {
  return status === 401 || status === 403
}

export function isConnectUnauthorized(err: unknown): boolean {
  // Over Connect-RPC the gateway's 401 surfaces as Unauthenticated and its 403
  // as PermissionDenied — both map to "needs a (re)established session".
  return err instanceof ConnectError && (err.code === Code.Unauthenticated || err.code === Code.PermissionDenied)
}

/**
 * Prefers a typed `status` (viem's `HttpRequestError`, fetch wrappers that
 * surface status). Falls back to a word-boundary `401`/`403` match on the
 * message for transports that only encode status in the error string.
 */
export function isFetchUnauthorized(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false
  }
  const status = (err as Error & { status?: unknown }).status
  if (typeof status === 'number') {
    return isSessionAuthFailureStatus(status)
  }
  return /\b(401|403)\b/.test(err.message)
}

function getSessionGateError(error: unknown): SessionReadyTimeoutError | SessionRecoveryFailedError | undefined {
  if (error instanceof SessionReadyTimeoutError || error instanceof SessionRecoveryFailedError) {
    return error
  }
  const cause = error instanceof Error ? error.cause : undefined
  if (cause instanceof SessionReadyTimeoutError || cause instanceof SessionRecoveryFailedError) {
    return cause
  }
  return undefined
}

export function isRetryableSessionGateError(error: unknown): boolean {
  const sessionGateError = getSessionGateError(error)
  return (
    sessionGateError instanceof SessionReadyTimeoutError ||
    (sessionGateError instanceof SessionRecoveryFailedError &&
      !(sessionGateError.recoveryError instanceof SessionError))
  )
}
