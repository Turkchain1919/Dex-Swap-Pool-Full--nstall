import { UniverseChainId } from '@universe/chains'
import { defaultResolveRpcConfig } from 'uniswap/src/features/providers/resolveRpcConfig'
import type { MockedFunction } from 'vitest'
import { isPrivateRpcSupportedOnChain } from 'wallet/src/features/providers/utils'
import { createTransactionConfigService } from 'wallet/src/features/transactions/executeTransaction/services/transactionConfigServiceImpl'

// Mock the providers utils
vi.mock('wallet/src/features/providers/utils', () => ({
  isPrivateRpcSupportedOnChain: vi.fn(),
}))

// Mock the platform-split rpc config resolver
vi.mock('uniswap/src/features/providers/resolveRpcConfig', () => ({
  defaultResolveRpcConfig: vi.fn(),
}))

describe('TransactionConfigService', () => {
  let mockIsPrivateRpcSupportedOnChain: MockedFunction<typeof isPrivateRpcSupportedOnChain>
  let mockDefaultResolveRpcConfig: MockedFunction<typeof defaultResolveRpcConfig>
  let transactionConfigService: ReturnType<typeof createTransactionConfigService>

  beforeEach(() => {
    vi.clearAllMocks()

    mockIsPrivateRpcSupportedOnChain = isPrivateRpcSupportedOnChain as MockedFunction<
      typeof isPrivateRpcSupportedOnChain
    >
    mockDefaultResolveRpcConfig = defaultResolveRpcConfig as MockedFunction<typeof defaultResolveRpcConfig>

    transactionConfigService = createTransactionConfigService()
  })

  describe('isPrivateRpcEnabled', () => {
    it('should always return true', () => {
      const result = transactionConfigService.isPrivateRpcEnabled()

      expect(result).toBe(true)
    })
  })

  describe('getPrivateRpcConfig', () => {
    it('should return flashbots enabled by default', () => {
      const result = transactionConfigService.getPrivateRpcConfig()

      expect(result).toEqual({ flashbotsEnabled: true })
    })
  })

  describe('getTransactionTimeoutMs', () => {
    it('should return 10 minutes for Mainnet', () => {
      const result = transactionConfigService.getTransactionTimeoutMs({ chainId: UniverseChainId.Mainnet })

      expect(result).toBe(10 * 60 * 1000) // 10 minutes in milliseconds
    })

    it('should return 1 minute for non-Mainnet chains', () => {
      const result = transactionConfigService.getTransactionTimeoutMs({ chainId: UniverseChainId.ArbitrumOne })

      expect(result).toBe(60 * 1000) // 1 minute in milliseconds
    })

    it('should return 1 minute for Optimism', () => {
      const result = transactionConfigService.getTransactionTimeoutMs({ chainId: UniverseChainId.Optimism })

      expect(result).toBe(60 * 1000) // 1 minute in milliseconds
    })

    it('should return 1 minute for Polygon', () => {
      const result = transactionConfigService.getTransactionTimeoutMs({ chainId: UniverseChainId.Polygon })

      expect(result).toBe(60 * 1000) // 1 minute in milliseconds
    })

    it('should return 1 minute for Base', () => {
      const result = transactionConfigService.getTransactionTimeoutMs({ chainId: UniverseChainId.Base })

      expect(result).toBe(60 * 1000) // 1 minute in milliseconds
    })
  })

  describe('shouldUsePrivateRpc', () => {
    beforeEach(() => {
      mockIsPrivateRpcSupportedOnChain.mockReturnValue(true)
    })

    it('should return true when all conditions are met: submitViaPrivateRpc=true and chain supports private RPC', () => {
      mockIsPrivateRpcSupportedOnChain.mockReturnValue(true)

      const result = transactionConfigService.shouldUsePrivateRpc({
        chainId: UniverseChainId.Mainnet,
        submitViaPrivateRpc: true,
      })

      expect(result).toBe(true)
      expect(mockIsPrivateRpcSupportedOnChain).toHaveBeenCalledWith(UniverseChainId.Mainnet)
    })

    it('should return false when submitViaPrivateRpc is false, even if chain supports private RPC', () => {
      mockIsPrivateRpcSupportedOnChain.mockReturnValue(true)

      const result = transactionConfigService.shouldUsePrivateRpc({
        chainId: UniverseChainId.Mainnet,
        submitViaPrivateRpc: false,
      })

      expect(result).toBe(false)
    })

    it('should return false when submitViaPrivateRpc is undefined, even if chain supports private RPC', () => {
      mockIsPrivateRpcSupportedOnChain.mockReturnValue(true)

      const result = transactionConfigService.shouldUsePrivateRpc({
        chainId: UniverseChainId.Mainnet,
        // submitViaPrivateRpc is undefined (default)
      })

      expect(result).toBe(false)
    })

    it('should return false when chain does not support private RPC, even if submitViaPrivateRpc=true', () => {
      mockIsPrivateRpcSupportedOnChain.mockReturnValue(false)

      const result = transactionConfigService.shouldUsePrivateRpc({
        chainId: UniverseChainId.ArbitrumOne,
        submitViaPrivateRpc: true,
      })

      expect(result).toBe(false)
      expect(mockIsPrivateRpcSupportedOnChain).toHaveBeenCalledWith(UniverseChainId.ArbitrumOne)
    })

    it('should return false when all conditions are false: submitViaPrivateRpc=false and chain does not support private RPC', () => {
      mockIsPrivateRpcSupportedOnChain.mockReturnValue(false)

      const result = transactionConfigService.shouldUsePrivateRpc({
        chainId: UniverseChainId.ArbitrumOne,
        submitViaPrivateRpc: false,
      })

      expect(result).toBe(false)
    })

    it('should work correctly for different chains that support private RPC', () => {
      mockIsPrivateRpcSupportedOnChain.mockReturnValue(true)

      const result = transactionConfigService.shouldUsePrivateRpc({
        chainId: UniverseChainId.Polygon,
        submitViaPrivateRpc: true,
      })

      expect(result).toBe(true)
      expect(mockIsPrivateRpcSupportedOnChain).toHaveBeenCalledWith(UniverseChainId.Polygon)
    })

    it('should return false for chains that do not support private RPC regardless of other conditions', () => {
      mockIsPrivateRpcSupportedOnChain.mockReturnValue(false)

      const result = transactionConfigService.shouldUsePrivateRpc({
        chainId: UniverseChainId.Base,
        submitViaPrivateRpc: true,
      })

      expect(result).toBe(false)
      expect(mockIsPrivateRpcSupportedOnChain).toHaveBeenCalledWith(UniverseChainId.Base)
    })
  })

  describe('getPrivateRpcProviderType', () => {
    it('returns unirpc when the private route resolves to UniRPC swap protection', () => {
      mockDefaultResolveRpcConfig.mockReturnValue({
        rpcUrl: 'https://gateway.example/rpc/1',
        isUniRpc: true,
        headers: { 'x-uni-swap-protection': 'true' },
      })

      const result = transactionConfigService.getPrivateRpcProviderType({ chainId: UniverseChainId.Mainnet })

      expect(result).toBe('unirpc')
    })

    it('returns flashbots when the private route resolves to Flashbots', () => {
      mockDefaultResolveRpcConfig.mockReturnValue({
        rpcUrl: 'https://rpc.flashbots.net/fast',
        shouldUseFlashbots: true,
        flashbotsConfig: { refundPercent: 90, calldataHintsEnabled: true },
      })

      const result = transactionConfigService.getPrivateRpcProviderType({ chainId: UniverseChainId.Mainnet })

      expect(result).toBe('flashbots')
    })

    it('falls back to mevblocker for a plain private endpoint or unresolvable config', () => {
      mockDefaultResolveRpcConfig.mockReturnValue({ rpcUrl: 'https://rpc.mevblocker.io' })
      expect(transactionConfigService.getPrivateRpcProviderType({ chainId: UniverseChainId.Mainnet })).toBe(
        'mevblocker',
      )

      mockDefaultResolveRpcConfig.mockReturnValue(null)
      expect(transactionConfigService.getPrivateRpcProviderType({ chainId: UniverseChainId.Mainnet })).toBe(
        'mevblocker',
      )
    })
  })
})
