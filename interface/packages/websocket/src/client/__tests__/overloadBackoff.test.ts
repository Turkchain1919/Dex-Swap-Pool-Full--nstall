import { connectViaSubscribe, createTestClient } from '@universe/websocket/src/client/__tests__/testUtils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 1013 ("try again later") means the server shed the connection on purpose —
 * per-user/per-task caps at the websocket service. The client must park the
 * socket for a long jittered hold instead of letting PartySocket's
 * seconds-scale retry loop re-trigger the shed.
 */
describe('overload (1013) reconnect hold', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('parks the socket on a 1013 close and re-arms after the hold', () => {
    const { client, mockSocket } = createTestClient()
    connectViaSubscribe({ client, mockSocket })

    mockSocket.simulateClose(1013, 'Server at capacity')

    // close() cancels PartySocket's built-in auto-retry immediately
    expect(mockSocket.closeCalls).toBe(1)
    expect(mockSocket.reconnectCalls).toBe(0)

    // Hold is 60s base + up to 50% jitter — nothing before the base elapses
    vi.advanceTimersByTime(59_000)
    expect(mockSocket.reconnectCalls).toBe(0)

    vi.advanceTimersByTime(31_001)
    expect(mockSocket.reconnectCalls).toBe(1)
  })

  it('leaves ordinary closes to the built-in retry loop', () => {
    const { client, mockSocket } = createTestClient()
    connectViaSubscribe({ client, mockSocket })

    mockSocket.simulateClose(1006, 'Abnormal closure')

    vi.advanceTimersByTime(120_000)
    expect(mockSocket.closeCalls).toBe(0)
    expect(mockSocket.reconnectCalls).toBe(0)
  })

  it('does not stack holds when 1013 closes repeat', () => {
    const { client, mockSocket } = createTestClient()
    connectViaSubscribe({ client, mockSocket })

    mockSocket.simulateClose(1013, 'Server at capacity')
    mockSocket.simulateClose(1013, 'Server at capacity')

    vi.advanceTimersByTime(120_000)
    expect(mockSocket.reconnectCalls).toBe(1)
  })

  it('cancels a pending hold when the client disconnects', async () => {
    const { client, mockSocket } = createTestClient()
    const unsub = connectViaSubscribe({ client, mockSocket })
    await vi.advanceTimersByTimeAsync(0)

    mockSocket.simulateClose(1013, 'Server at capacity')
    unsub()
    // Last unsubscribe debounces 2s before disconnecting
    await vi.advanceTimersByTimeAsync(2000)

    await vi.advanceTimersByTimeAsync(120_000)
    expect(mockSocket.reconnectCalls).toBe(0)
    expect(client.getConnectionStatus()).toBe('disconnected')
  })

  it('honors a custom overload code set and delay', () => {
    const { client, mockSocket } = createTestClient({
      config: { url: 'wss://test.example.com', overloadCloseCodes: [4001], overloadRetryDelayMs: 10_000 },
    })
    connectViaSubscribe({ client, mockSocket })

    mockSocket.simulateClose(1013, 'not in the custom set')
    expect(mockSocket.closeCalls).toBe(0)

    mockSocket.simulateClose(4001, 'custom shed code')
    expect(mockSocket.closeCalls).toBe(1)

    vi.advanceTimersByTime(15_001)
    expect(mockSocket.reconnectCalls).toBe(1)
  })
})
