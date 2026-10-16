import { type Platform, chainIdToPlatform, type UniverseChainIdByPlatform } from '@universe/chains'

export type FlexiblePlatformInput<P extends Platform = Platform> = P | UniverseChainIdByPlatform<P>

export function resolvePlatform<P extends Platform>(platformInput: FlexiblePlatformInput<P>): P {
  if (typeof platformInput === 'number') {
    return chainIdToPlatform(platformInput) as P
  }

  return platformInput
}
