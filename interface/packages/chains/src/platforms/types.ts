import type { HexString } from '@universe/encoding'
import { UniverseChainId } from '../rpc/types'

export enum Platform {
  EVM = 'evm',
  SVM = 'svm',
}

/**
 * Generic utility type for narrowing an address string by platform; mainly used to enforce
 * EVM `0x` prefixes, which simplifies interactions with some libraries.
 */
export type PlatformSpecificAddress<P extends Platform> = P extends Platform.EVM ? HexString : string

/** An address paired with its platform type. */
export interface PlatformAddress {
  address: string
  platform: Platform
}

// Solana is currently the only SVM chain, so the platform-scoped chain-id types derive
// directly from UniverseChainId rather than from the heavier chain-info metadata.
export type SVMUniverseChainId = UniverseChainId.Solana
export type EVMUniverseChainId = Exclude<UniverseChainId, SVMUniverseChainId>
export type UniverseChainIdByPlatform<P extends Platform> = P extends Platform.SVM
  ? SVMUniverseChainId
  : EVMUniverseChainId
