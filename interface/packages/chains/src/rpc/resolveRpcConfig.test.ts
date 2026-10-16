import { describe, expect, test } from 'vitest'
import { createRpcConfigResolver } from './resolveRpcConfig'
import type { RpcConfig } from './rpcUrlSelector'
import { RPCType, UniverseChainId } from './types'

const ENTRY_GATEWAY = 'https://entry-gateway.test.uniswap.org'

const getRequestHeaders = async (): Promise<Record<string, string>> => ({
  'X-Session-ID': 'session-123',
  'X-Device-ID': 'device-123',
})

// Mirrors the platform wiring (native/web): promote an entry-gateway URL the legacy
// path returns so it carries session auth.
const asUniRpcConfig = (config: RpcConfig): RpcConfig =>
  config.rpcUrl.startsWith(`${ENTRY_GATEWAY}/rpc/`)
    ? { ...config, isUniRpc: true, headers: { 'x-request-source': 'test', ...config.headers }, getRequestHeaders }
    : config

describe('createRpcConfigResolver', () => {
  test('promotes a legacy-path entry-gateway URL to authenticated UniRPC (gate off / pre-Statsig)', () => {
    const resolve = createRpcConfigResolver({
      resolveUniRpcConfig: () => null,
      selectLegacyRpcUrl: (chainId) => ({ rpcUrl: `${ENTRY_GATEWAY}/rpc/${chainId}` }),
      asUniRpcConfig,
    })

    const config = resolve({ chainId: UniverseChainId.Mainnet, rpcType: RPCType.Public })

    // The original bug: this came back without isUniRpc/getRequestHeaders → 401.
    expect(config?.isUniRpc).toBe(true)
    expect(config?.getRequestHeaders).toBe(getRequestHeaders)
  })

  test('leaves a non-entry-gateway legacy URL unauthenticated', () => {
    const resolve = createRpcConfigResolver({
      resolveUniRpcConfig: () => null,
      selectLegacyRpcUrl: () => ({ rpcUrl: 'https://example.quiknode.pro/key' }),
      asUniRpcConfig,
    })

    const config = resolve({ chainId: UniverseChainId.Mainnet, rpcType: RPCType.Public })

    expect(config?.isUniRpc).toBeUndefined()
    expect(config?.getRequestHeaders).toBeUndefined()
  })

  test('prefers the primary UniRPC config when the gate is on', () => {
    const resolve = createRpcConfigResolver({
      resolveUniRpcConfig: ({ chainId }) => ({
        rpcUrl: `${ENTRY_GATEWAY}/rpc/${chainId}`,
        headers: {},
        getRequestHeaders,
      }),
      selectLegacyRpcUrl: () => ({ rpcUrl: 'https://should-not-be-used.example' }),
      asUniRpcConfig,
    })

    const config = resolve({ chainId: UniverseChainId.Mainnet, rpcType: RPCType.Public })

    expect(config?.isUniRpc).toBe(true)
    expect(config?.rpcUrl).toBe(`${ENTRY_GATEWAY}/rpc/${UniverseChainId.Mainnet}`)
  })

  test('routes Private RPC through UniRPC with the swap-protection header', () => {
    const resolve = createRpcConfigResolver({
      resolveUniRpcConfig: ({ chainId }) => ({
        rpcUrl: `${ENTRY_GATEWAY}/rpc/${chainId}`,
        headers: { 'x-request-source': 'test' },
        getRequestHeaders,
      }),
      selectLegacyRpcUrl: () => ({ rpcUrl: 'https://private.example' }),
      asUniRpcConfig,
    })

    const config = resolve({ chainId: UniverseChainId.Mainnet, rpcType: RPCType.Private })

    expect(config?.rpcUrl).toBe(`${ENTRY_GATEWAY}/rpc/${UniverseChainId.Mainnet}`)
    expect(config?.isUniRpc).toBe(true)
    expect(config?.headers).toEqual({ 'x-request-source': 'test', 'x-uni-swap-protection': 'true' })
    expect(config?.getRequestHeaders).toBe(getRequestHeaders)
    expect(config?.shouldUseFlashbots).toBeUndefined()
  })

  test('falls back to the legacy private path when UniRPC is unavailable', () => {
    const resolve = createRpcConfigResolver({
      resolveUniRpcConfig: () => null,
      selectLegacyRpcUrl: () => ({ rpcUrl: 'https://private.example' }),
      asUniRpcConfig,
    })

    const config = resolve({ chainId: UniverseChainId.Mainnet, rpcType: RPCType.Private })

    expect(config?.rpcUrl).toBe('https://private.example')
    expect(config?.isUniRpc).toBeUndefined()
  })

  test('adds the swap-protection header to a promoted legacy Private config (label/header invariant)', () => {
    // The legacy path can return an entry-gateway URL that `asUniRpcConfig` promotes to
    // isUniRpc — downstream labels the tx 'unirpc' and skips the Protect poll, so the
    // header must ride along or the submission would be silently unprotected.
    const resolve = createRpcConfigResolver({
      resolveUniRpcConfig: () => null,
      selectLegacyRpcUrl: (chainId) => ({ rpcUrl: `${ENTRY_GATEWAY}/rpc/${chainId}` }),
      asUniRpcConfig,
    })

    const config = resolve({ chainId: UniverseChainId.Mainnet, rpcType: RPCType.Private })

    expect(config?.isUniRpc).toBe(true)
    expect(config?.headers?.['x-uni-swap-protection']).toBe('true')
  })

  test('does not add the swap-protection header to public UniRPC traffic (primary or promoted)', () => {
    const primary = createRpcConfigResolver({
      resolveUniRpcConfig: ({ chainId }) => ({
        rpcUrl: `${ENTRY_GATEWAY}/rpc/${chainId}`,
        headers: { 'x-request-source': 'test' },
        getRequestHeaders,
      }),
      selectLegacyRpcUrl: () => null,
      asUniRpcConfig,
    })
    expect(primary({ chainId: UniverseChainId.Mainnet, rpcType: RPCType.Public })?.headers).toEqual({
      'x-request-source': 'test',
    })

    const promoted = createRpcConfigResolver({
      resolveUniRpcConfig: () => null,
      selectLegacyRpcUrl: (chainId) => ({ rpcUrl: `${ENTRY_GATEWAY}/rpc/${chainId}` }),
      asUniRpcConfig,
    })
    expect(
      promoted({ chainId: UniverseChainId.Mainnet, rpcType: RPCType.Public })?.headers?.['x-uni-swap-protection'],
    ).toBeUndefined()
  })
})
