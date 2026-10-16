/**
 * Shared ConnectRPC-over-HTTP helper for config-manager server clients.
 * POSTs JSON to `${baseUrl}${path}` — the ConnectRPC HTTP/JSON protocol.
 */

/**
 * A non-2xx RPC response, carrying the status and Connect error code alongside
 * the message.
 *
 * Callers have to tell "this thing does not exist" apart from "the call failed",
 * and only the status and `code` say which — a Connect error body's `message` is
 * prose the service is free to reword. `NotFound` renders as `NotFound: <message>`,
 * so the absence of one resource reads as `NotFound: Parameter not found: /a/b/c`
 * and of another as `NotFound: There is no current proposal for this parameter.`;
 * a matcher tuned to either one silently misses the other.
 *
 * `connectCode` is undefined when the body is not a Connect error at all. That is
 * what separates absence from an unreachable service, because the two share the
 * 404 status and both bodies are JSON — only the `code` differs. Captured from
 * `entry-gateway.backend-dev.api.uniswap.org`, an unrouted path answers:
 * `{"message":"Route POST:/… not found","error":"Not Found","statusCode":404}`
 * — no `code`, so a config-service that is not deployed reads as a failed call
 * rather than as "the resource is absent".
 */
export class RpcHttpError extends Error {
  // oxlint-disable-next-line max-params -- optional connectCode mirrors the Connect error body fields
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly connectCode?: string,
  ) {
    super(message)
    this.name = 'RpcHttpError'
  }
}

/** The HTTP status of a failed `rpcPost`, through any number of re-wraps. */
export function rpcHttpStatus(error: unknown): number | undefined {
  if (error instanceof RpcHttpError) {
    return error.httpStatus
  }
  return error instanceof Error && error.cause instanceof Error ? rpcHttpStatus(error.cause) : undefined
}

/** The Connect error code of a failed `rpcPost`, through any number of re-wraps. */
export function rpcConnectCode(error: unknown): string | undefined {
  if (error instanceof RpcHttpError) {
    return error.connectCode
  }
  return error instanceof Error && error.cause instanceof Error ? rpcConnectCode(error.cause) : undefined
}

/**
 * Whether a failed `rpcPost` means the resource does not exist, as opposed to the
 * call having failed. Both halves are required, so the rule lives here rather than
 * being re-derived by every caller that folds absence into `null`.
 *
 * config-service serializes its `NotFound` through Connect's `errorToJson`, which
 * emits the code as a snake_case string:
 * `{"code":"not_found","message":"NotFound: There is no current proposal for this parameter."}`
 */
export function isRpcNotFound(error: unknown): boolean {
  return rpcHttpStatus(error) === 404 && rpcConnectCode(error) === 'not_found'
}

// oxlint-disable-next-line max-params -- verbatim signature from mission-control migration
export async function rpcPost<T>(
  baseUrl: string,
  path: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })

  const text = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    if (!response.ok) {
      throw new RpcHttpError(`HTTP ${response.status}`, response.status)
    }
    return {} as T
  }

  if (!response.ok) {
    const errorBody =
      typeof parsed === 'object' && parsed !== null ? (parsed as { message?: unknown; code?: unknown }) : {}
    const msg = 'message' in errorBody ? String(errorBody.message) : `HTTP ${response.status}`
    throw new RpcHttpError(msg, response.status, typeof errorBody.code === 'string' ? errorBody.code : undefined)
  }

  return parsed as T
}
