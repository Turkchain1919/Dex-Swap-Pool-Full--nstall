import { UNI_SWAP_PROTECTION_HEADER, type UniRpcConfig } from './getUniRpcConfig'
import type { RpcConfig } from './rpcUrlSelector'
import { RPCType, UniverseChainId } from './types'

export interface RpcConfigResolverInput {
  chainId: UniverseChainId
  rpcType: RPCType
}

export type RpcConfigResolver = (input: RpcConfigResolverInput) => RpcConfig | null

interface RpcConfigResolverCtx {
  resolveUniRpcConfig: (input: { chainId: UniverseChainId }) => UniRpcConfig | null
  selectLegacyRpcUrl: (chainId: UniverseChainId, rpcType: RPCType) => RpcConfig | null
  // Promotes a legacy-path config to authenticated UniRPC when its URL is the entry
  // gateway. The gateway requires the session no matter how the URL was selected
  // (flag off, pre-Statsig, or a static Public-RPC fallback), so the auth decision
  // lives in one place instead of only on the primary branch. No-op for other URLs.
  asUniRpcConfig?: (config: RpcConfig) => RpcConfig
}

export function createRpcConfigResolver(ctx: RpcConfigResolverCtx): RpcConfigResolver {
  const promote = ctx.asUniRpcConfig ?? ((config: RpcConfig): RpcConfig => config)
  return (input: RpcConfigResolverInput): RpcConfig | null => {
    let config: RpcConfig | null = null
    const uniRpcConfig = ctx.resolveUniRpcConfig({ chainId: input.chainId })
    if (uniRpcConfig) {
      config = {
        rpcUrl: uniRpcConfig.rpcUrl,
        isUniRpc: true,
        headers: uniRpcConfig.headers,
        getRequestHeaders: uniRpcConfig.getRequestHeaders,
        credentials: uniRpcConfig.credentials,
      }
    }

    if (!config) {
      const legacyConfig = ctx.selectLegacyRpcUrl(input.chainId, input.rpcType)
      config = legacyConfig ? promote(legacyConfig) : legacyConfig
    }

    // Invariant: every gateway-bound Private config carries the protection header,
    // regardless of which branch produced it (primary or promoted legacy). Downstream
    // consumers (privateRpcProvider label, watcher poll skip) key on isUniRpc and must
    // never diverge from what actually goes on the wire.
    if (config?.isUniRpc && input.rpcType === RPCType.Private) {
      return { ...config, headers: { ...config.headers, [UNI_SWAP_PROTECTION_HEADER]: 'true' } }
    }
    return config
  }
}
