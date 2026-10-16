import { normalizeTokenAddressForCache } from '@universe/chains'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

export const priceKeys = {
  all: [ReactQueryCacheKey.TokenPrice] as const,
  token: (chainId: number, address: string) =>
    [ReactQueryCacheKey.TokenPrice, chainId, normalizeTokenAddressForCache(address)] as const,
} as const
