import { priceKeys } from '@universe/prices/src/queries/priceKeys'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'
import { describe, expect, it } from 'vitest'

// Full-length so it passes EVM address validation in the cache-key normalizer
const TOKEN_ADDRESS = `0x${'A'.repeat(40)}`
const TOKEN_ADDRESS_LOWERCASE = `0x${'a'.repeat(40)}`

describe('priceKeys', () => {
  describe('all', () => {
    it('returns array with TokenPrice cache key', () => {
      expect(priceKeys.all).toEqual([ReactQueryCacheKey.TokenPrice])
    })
  })

  describe('token', () => {
    it('returns key with chainId and lowercased address', () => {
      const key = priceKeys.token(1, TOKEN_ADDRESS)
      expect(key).toEqual([ReactQueryCacheKey.TokenPrice, 1, TOKEN_ADDRESS_LOWERCASE])
    })

    it('handles already lowercased address', () => {
      const key = priceKeys.token(42161, TOKEN_ADDRESS_LOWERCASE)
      expect(key).toEqual([ReactQueryCacheKey.TokenPrice, 42161, TOKEN_ADDRESS_LOWERCASE])
    })
  })
})
