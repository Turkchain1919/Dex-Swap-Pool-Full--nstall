"use strict"
const { ethers } = require('ethers')

const EVENT_ABIS = {
  V2Factory: 'event PairCreated(address indexed token0,address indexed token1,address pair,uint256)',
  V3Factory: 'event PoolCreated(address indexed token0,address indexed token1,uint24 indexed fee,int24 tickSpacing,address pool)',
  V4PoolManager: 'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)',
}

class TurkchainRealtime {
  constructor({ url, registry, onHead = () => {}, onPoolEvent = () => {}, providerFactory } = {}) {
    this.url = url
    this.registry = registry
    this.onHead = onHead
    this.onPoolEvent = onPoolEvent
    this.providerFactory = providerFactory || ((rpcUrl) => new ethers.providers.WebSocketProvider(rpcUrl, { name: 'turkchain', chainId: 1919 }))
    this.provider = null
    this.retryTimer = null
    this.retryDelay = 1000
    this.reconnectAttempts = 0
    this.lastBlock = null
    this.lastMessageAt = null
    this.lastErrorCode = null
    this.connected = false
    this.stopped = true
    this.seenLogs = new Set()
    this.listeners = new Set()
  }
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  publish(event) {
    for (const listener of this.listeners) {
      try { listener(event) } catch {}
    }
  }
  status() {
    return { configured: Boolean(this.url), connected: this.connected, chainId: this.connected ? 1919 : null, lastBlock: this.lastBlock, lastMessageAt: this.lastMessageAt, reconnectAttempts: this.reconnectAttempts, lastErrorCode: this.lastErrorCode }
  }
  start() {
    if (!this.url || this.provider || this.retryTimer) return
    this.stopped = false
    this.connect()
  }
  connect() {
    if (this.stopped || this.provider) return
    let provider
    try { provider = this.providerFactory(this.url) } catch (error) { this.scheduleReconnect(error); return }
    this.provider = provider
    const fail = (error) => this.scheduleReconnect(error)
    provider.send('eth_chainId', []).then((chainId) => {
      if (Number(BigInt(chainId)) !== 1919) throw Object.assign(new Error('RPC chain mismatch'), { code: 'WRONG_CHAIN' })
      if (this.provider === provider) { this.connected = true; this.retryDelay = 1000; this.lastErrorCode = null }
    }).catch(fail)
    provider.on('block', (blockNumber) => {
      if (this.provider !== provider || !Number.isSafeInteger(Number(blockNumber))) return
      const block = Number(blockNumber)
      if (this.lastBlock !== null && block <= this.lastBlock) return
      this.lastBlock = block
      this.lastMessageAt = new Date().toISOString()
      this.connected = true
      this.onHead(block)
      this.publish({ type: 'newHead', blockNumber: block })
    })
    for (const [name, abi] of Object.entries(EVENT_ABIS)) {
      const address = this.registry?.contracts?.[name]
      if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) continue
      const iface = new ethers.utils.Interface([abi])
      const eventName = abi.slice(6, abi.indexOf('('))
      const filter = { address: ethers.utils.getAddress(address.toLowerCase()), topics: [iface.getEventTopic(eventName)] }
      provider.on(filter, (log) => {
        if (this.provider !== provider || !log?.transactionHash || log.logIndex === undefined) return
        const key = `${log.transactionHash.toLowerCase()}:${log.logIndex}`
        if (this.seenLogs.has(key)) return
        this.seenLogs.add(key)
        if (this.seenLogs.size > 4096) this.seenLogs.delete(this.seenLogs.values().next().value)
        this.lastMessageAt = new Date().toISOString()
        const event = { type: 'poolEvent', protocol: name === 'V2Factory' ? 'V2' : name === 'V3Factory' ? 'V3' : 'V4', blockNumber: log.blockNumber, transactionHash: log.transactionHash, logIndex: log.logIndex }
        this.onPoolEvent(event)
        this.publish(event)
      })
    }
    const socket = provider._websocket
    socket?.on?.('close', () => this.scheduleReconnect(Object.assign(new Error('WebSocket closed'), { code: 'WS_CLOSED' })))
    socket?.on?.('error', (error) => this.scheduleReconnect(error))
    provider.on('error', fail)
  }
  scheduleReconnect(error) {
    if (this.stopped || this.retryTimer) return
    this.connected = false
    this.lastErrorCode = typeof error?.code === 'string' || typeof error?.code === 'number' ? String(error.code).slice(0, 40) : 'WS_ERROR'
    const old = this.provider
    this.provider = null
    if (old) {
      try { old.removeAllListeners() } catch {}
      try { old.destroy() } catch {}
    }
    this.reconnectAttempts += 1
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect()
    }, this.retryDelay)
    this.retryTimer.unref?.()
    this.retryDelay = Math.min(this.retryDelay * 2, 30000)
  }
  stop() {
    this.stopped = true
    this.connected = false
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
    const old = this.provider
    this.provider = null
    if (old) {
      try { old.removeAllListeners() } catch {}
      try { old.destroy() } catch {}
    }
  }
}
module.exports = { TurkchainRealtime, EVENT_ABIS }
