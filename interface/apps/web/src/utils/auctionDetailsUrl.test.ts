import { UniverseChainId } from '@universe/chains'
import { describe, expect, it } from 'vitest'
import { getAuctionDetailsURL } from '~/utils/auctionDetailsUrl'

const AUCTION_ADDRESS = '0x1111111111111111111111111111111111111111'

describe('getAuctionDetailsURL', () => {
  it.each([
    [UniverseChainId.Mainnet, 'ethereum'],
    [UniverseChainId.Unichain, 'unichain'],
    [UniverseChainId.Base, 'base'],
    [UniverseChainId.ArbitrumOne, 'arbitrum'],
    [UniverseChainId.Arc, 'arc'],
    [UniverseChainId.Avalanche, 'avalanche'],
    [UniverseChainId.Robinhood, 'robinhood'],
    [UniverseChainId.Sepolia, 'ethereum_sepolia'],
  ])('builds the auction details URL for chain %s', (chainId, chainUrlParam) => {
    expect(
      getAuctionDetailsURL({
        chainId,
        auctionAddress: AUCTION_ADDRESS,
      }),
    ).toBe(`/explore/auctions/${chainUrlParam}/${AUCTION_ADDRESS}`)
  })

  it.each([
    ['checksummed', '0xabCDEf1111111111111111111111111111111111'],
    ['incorrectly checksummed', '0xAbCDEf1111111111111111111111111111111111'],
    ['uppercase', '0xABCDEF1111111111111111111111111111111111'],
  ])('normalizes a %s auction address', (_label, auctionAddress) => {
    expect(
      getAuctionDetailsURL({
        chainId: UniverseChainId.Mainnet,
        auctionAddress,
      }),
    ).toBe('/explore/auctions/ethereum/0xabcdef1111111111111111111111111111111111')
  })

  it.each([0, 999_999, UniverseChainId.Solana])('returns undefined for unsupported chain %s', (chainId) => {
    expect(
      getAuctionDetailsURL({
        chainId,
        auctionAddress: AUCTION_ADDRESS,
      }),
    ).toBeUndefined()
  })

  it.each(['', '0x1234', `0x${'g'.repeat(40)}`, `0x${'1'.repeat(39)}/`])(
    'returns undefined for invalid auction address %s',
    (auctionAddress) => {
      expect(
        getAuctionDetailsURL({
          chainId: UniverseChainId.Mainnet,
          auctionAddress,
        }),
      ).toBeUndefined()
    },
  )
})
