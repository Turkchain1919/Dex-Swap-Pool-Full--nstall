import type { UniverseChainId } from '@universe/chains'

export type PrivateRpcProviderType = 'flashbots' | 'unirpc' | 'mevblocker'

/**
 * Service for transaction-related configuration
 * Centralizes access to configuration values
 */
export interface TransactionConfigService {
  /**
   * Check if private RPC feature is enabled
   * @returns True if private RPC is enabled
   */
  isPrivateRpcEnabled(): boolean

  /**
   * Get configuration for private RPC
   * @returns Configuration object for private RPC
   */
  getPrivateRpcConfig(): {
    flashbotsEnabled: boolean
  }

  /**
   * Get transaction timeout in milliseconds for a chain
   * @param chainId The blockchain chain ID
   * @returns Timeout in milliseconds
   */
  getTransactionTimeoutMs(input: { chainId: UniverseChainId }): number

  /**
   * Determine if private RPC should be used for a chain
   * @param input The input object containing chainId and submitViaPrivateRpc
   * @returns True if private RPC should be used
   */
  shouldUsePrivateRpc(input: { chainId: UniverseChainId; submitViaPrivateRpc?: boolean }): boolean

  /**
   * Which provider actually serves the chain's private (swap protection) RPC:
   * UniRPC v2 with the swap-protection header, Flashbots directly, or the
   * chain-info MEV-blocker fallback. Derived from the same resolver that builds
   * the provider, so labeling and routing can't disagree.
   */
  getPrivateRpcProviderType(input: { chainId: UniverseChainId }): PrivateRpcProviderType
}
