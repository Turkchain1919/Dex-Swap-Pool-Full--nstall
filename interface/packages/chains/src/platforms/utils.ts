import { UniverseChainId } from '../rpc/types'
import { Platform, type UniverseChainIdByPlatform } from './types'

// Solana is currently the only SVM chain. Deriving the platform from the chain id directly
// keeps this module free of any chain-info metadata dependency.
const SVM_CHAIN_IDS = new Set<UniverseChainId>([UniverseChainId.Solana])

export function chainIdToPlatform(chainId: UniverseChainId): Platform {
  return SVM_CHAIN_IDS.has(chainId) ? Platform.SVM : Platform.EVM
}

export function isChainIdOnPlatform<P extends Platform>(
  chainId: UniverseChainId,
  platform: P,
): chainId is UniverseChainIdByPlatform<P> {
  return chainIdToPlatform(chainId) === platform
}

function createPlatformChecker<T extends Platform>(platform: T) {
  return (chainId: UniverseChainId): chainId is UniverseChainIdByPlatform<T> => isChainIdOnPlatform(chainId, platform)
}

export const isEVMChain = createPlatformChecker(Platform.EVM)
export const isSVMChain = createPlatformChecker(Platform.SVM)
