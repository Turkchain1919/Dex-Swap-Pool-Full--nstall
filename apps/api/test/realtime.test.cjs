"use strict"
const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { TurkchainRealtime } = require('../realtime.cjs')

class MockProvider extends EventEmitter {
  constructor(chainId = 1919) { super(); this.chainId = chainId; this.filters = []; this._websocket = new EventEmitter(); this.destroyed = false }
  getNetwork() { return Promise.resolve({ chainId: this.chainId }) }
  send(method) { return Promise.resolve(method === 'eth_chainId' ? `0x${this.chainId.toString(16)}` : null) }
  on(event, listener) {
    if (typeof event === 'object') { this.filters.push({ event, listener }); return this }
    return super.on(event, listener)
  }
  removeAllListeners(event) {
    if (event && typeof event === 'object') { this.filters = this.filters.filter((item) => item.event !== event); return this }
    this.filters = []
    return super.removeAllListeners(event)
  }
  destroy() { this.destroyed = true }
  emitLog(log) { for (const { event, listener } of this.filters) if (event.address.toLowerCase() === log.address.toLowerCase() && event.topics[0] === log.topics[0]) listener(log) }
}
const registry = { contracts: { V2Factory: '0x84355FacB2fC6A1C47679b5fa8dd4312546c7916', V3Factory: '0xf976dEAa82B208A36C7D78Adb738e099dc017912', V4PoolManager: '0xd5cd70a82739C4e54c5953c4c1Adf4D6F55B134b' } }

test('WSS watcher consumes heads and deduplicates V2/V3/V4 logs', async () => {
  const provider = new MockProvider()
  const heads = [], events = [], streamEvents = []
  const realtime = new TurkchainRealtime({ url: 'wss://evm-ws.turkscan.com', registry, providerFactory: () => provider, onHead: (block) => heads.push(block), onPoolEvent: (event) => events.push(event) })
  realtime.start()
  const unsubscribe = realtime.subscribe((event) => streamEvents.push(event))
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(provider.listenerCount('block'), 1)
  assert.equal(provider.filters.length, 3)
  provider.emit('block', 100n)
  provider.emit('block', 100n)
  assert.deepEqual(heads, [100])
  assert.equal(streamEvents[0].type, 'newHead')
  const v2 = provider.filters[0].event
  const log = { address: v2.address, topics: v2.topics, transactionHash: `0x${'11'.repeat(32)}`, logIndex: 1, blockNumber: 101 }
  provider.emitLog(log); provider.emitLog(log)
  assert.equal(events.length, 1)
  assert.equal(events[0].protocol, 'V2')
  assert.equal(streamEvents[1].type, 'poolEvent')
  unsubscribe()
  assert.equal(realtime.status().chainId, 1919)
  realtime.stop()
  assert.equal(realtime.status().connected, false)
})

test('WSS watcher reconnects after disconnect with bounded backoff', async () => {
  const providers = []
  const realtime = new TurkchainRealtime({ url: 'wss://evm-ws.turkscan.com', registry, providerFactory: () => { const p = new MockProvider(); providers.push(p); return p } })
  realtime.start()
  await new Promise((resolve) => setImmediate(resolve))
  providers[0]._websocket.emit('close')
  await new Promise((resolve) => setTimeout(resolve, 1200))
  assert.equal(providers.length, 2)
  assert.equal(realtime.status().reconnectAttempts, 1)
  realtime.stop()
})
