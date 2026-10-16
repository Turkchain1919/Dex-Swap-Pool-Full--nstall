// @vitest-environment jsdom
import { WebSocket as PartySocket } from 'partysocket'
import { describe, expect, it, vi } from 'vitest'

/**
 * The two partysocket behaviours the revive design rests on, pinned against
 * the REAL library rather than our MockWebSocket — which is built to satisfy
 * the guard and so cannot falsify it.
 *
 * 1. A socket that has spent its `maxRetries` budget reads CLOSED. If it read
 *    CONNECTING (the getter's fallback when `_ws` is unset), `reviveConnection`
 *    would treat it as still trying and never revive.
 * 2. `reconnect()` on that socket does nothing. `_connect` sets `_connectLock`
 *    before the `_retryCount >= maxRetries` bail and never releases it, so the
 *    instance is unrecoverable — which is why the client swaps in a FRESH
 *    socket instead of calling `reconnect()`.
 *
 * A stub `WebSocket` (partysocket's own `options.WebSocket` seam) fails every
 * connection immediately, so the ladder burns down deterministically with no
 * network and no real timers.
 */

/** Fails on construction, one macrotask later — the refused-connection shape. */
function createFailingWebSocketClass(onConstruct: () => void): typeof WebSocket {
  return class FailingWebSocket extends EventTarget {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3
    readyState = 0
    binaryType = 'blob'
    url: string

    constructor(url: string) {
      super()
      this.url = url
      onConstruct()
      setTimeout(() => {
        this.readyState = 3
        this.dispatchEvent(new Event('error'))
        this.dispatchEvent(new CloseEvent('close', { code: 1006, reason: 'refused' }))
      }, 0)
    }

    close(): void {
      this.readyState = 3
    }
    send(): void {}
  } as unknown as typeof WebSocket
}

describe('partysocket retry exhaustion (real library)', () => {
  it('reads CLOSED once the retry budget is spent, and cannot be revived by reconnect()', async () => {
    vi.useFakeTimers()
    let constructions = 0
    const maxRetries = 3

    const socket = new PartySocket('ws://127.0.0.1:1', [], {
      WebSocket: createFailingWebSocketClass(() => {
        constructions += 1
      }),
      maxRetries,
      minReconnectionDelay: 10,
      maxReconnectionDelay: 20,
      reconnectionDelayGrowFactor: 1,
      connectionTimeout: 50,
    })

    // Burn the whole ladder.
    await vi.advanceTimersByTimeAsync(5_000)
    const afterExhaustion = constructions
    // The ladder really ran: the initial attempt plus every retry in the budget.
    expect(afterExhaustion).toBe(maxRetries + 1)

    // (1) The state the client's guard depends on.
    expect(socket.readyState).toBe(WebSocket.CLOSED)

    // (2) The instance is unrecoverable, which is why we swap rather than reconnect.
    socket.reconnect()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(constructions).toBe(afterExhaustion)

    socket.close()
    vi.useRealTimers()
  })
})
