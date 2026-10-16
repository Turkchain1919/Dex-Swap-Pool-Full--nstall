import type { RankedMultichainToken } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { UniverseChainId } from '@universe/chains'
import { ALL_CHAIN_IDS } from 'uniswap/src/features/chains/chainInfo'
import { createRankedMultichainToken } from 'uniswap/src/test/fixtures/dataApi/rankedMultichainToken'
import { describe, expect, it } from 'vitest'
import { processMultichainTokensForDisplay } from '~/features/Explore/state/listTokens/utils/processMultichainTokensForDisplay'

describe('processMultichainTokensForDisplay', () => {
  it('should return topTokens in backend order', () => {
    const tokens = [
      createRankedMultichainToken({ multichainId: 'mc:a', symbol: 'A', price: 1 }),
      createRankedMultichainToken({ multichainId: 'mc:b', symbol: 'B', price: 2 }),
    ]
    const { topTokens, tokenSortRank } = processMultichainTokensForDisplay({
      tokens,
      allowedChainIds: ALL_CHAIN_IDS,
    })
    expect(topTokens).toHaveLength(2)
    expect(topTokens[0]?.multichainToken?.symbol).toBe('A')
    expect(topTokens[1]?.multichainToken?.symbol).toBe('B')
    expect(tokenSortRank[topTokens[0]!.multichainToken!.multichainId]).toBe(1)
    expect(tokenSortRank[topTokens[1]!.multichainToken!.multichainId]).toBe(2)
  })

  it('should drop repeat multichainIds, keeping the first occurrence (e.g. the same token returned twice in one fetch)', () => {
    const firstSeen = createRankedMultichainToken({ multichainId: 'mc:dup', symbol: 'DUP', price: 1 })
    const repeat = createRankedMultichainToken({ multichainId: 'mc:dup', symbol: 'DUP', price: 1 })
    const other = createRankedMultichainToken({ multichainId: 'mc:unique', symbol: 'UNIQUE', price: 2 })
    const { topTokens } = processMultichainTokensForDisplay({
      tokens: [firstSeen, repeat, other],
      allowedChainIds: ALL_CHAIN_IDS,
    })
    expect(topTokens).toHaveLength(2)
    expect(topTokens[0]).toBe(firstSeen)
    expect(topTokens[1]).toBe(other)
  })

  it('should drop a token missing its multichainToken payload (empty network set renders no row)', () => {
    const withoutId = { multichainToken: undefined } as unknown as RankedMultichainToken
    const withId = createRankedMultichainToken({ multichainId: 'mc:a', symbol: 'B' })
    const { topTokens, tokenSortRank } = processMultichainTokensForDisplay({
      tokens: [withoutId, withoutId, withId],
      allowedChainIds: ALL_CHAIN_IDS,
    })
    // A payload-less row has no addresses, so its filtered network set is empty: it would
    // render "0 networks" with no icons or TDP link, so it produces no row and no rank.
    expect(topTokens).toHaveLength(1)
    expect(topTokens[0]).toBe(withId)
    expect(tokenSortRank['mc:a']).toBe(1)
  })

  it('should drop a token whose every addresses leg is outside the allowed list, keeping ranks contiguous', () => {
    // Impossible for well-formed data (the FE only requests enabled chains, so a ranked token
    // must have at least one enabled leg); defensive hide of inconsistent data per reviewer
    // direction. The drop runs before ranking, so the next visible token takes the dropped
    // token's rank number instead of leaving a numbering gap.
    const first = createRankedMultichainToken({ multichainId: 'mc:first', symbol: 'FIRST', addresses: { '1': '0xa' } })
    const unsupported = createRankedMultichainToken({
      multichainId: 'mc:unsupported',
      symbol: 'GONE',
      addresses: { '57073': '0xb', '999999999': '0xc' },
    })
    const next = createRankedMultichainToken({ multichainId: 'mc:next', symbol: 'NEXT', addresses: { '10': '0xd' } })
    const { topTokens, tokenSortRank } = processMultichainTokensForDisplay({
      tokens: [first, unsupported, next],
      allowedChainIds: [UniverseChainId.Mainnet, UniverseChainId.Optimism],
    })
    expect(topTokens.map((t) => t.multichainToken?.symbol)).toEqual(['FIRST', 'NEXT'])
    expect(tokenSortRank['mc:first']).toBe(1)
    expect(tokenSortRank['mc:next']).toBe(2)
    expect(tokenSortRank['mc:unsupported']).toBeUndefined()
  })
  it('should give ungrouped singles (empty multichainId) distinct ranks instead of colliding', () => {
    const tokens = [
      createRankedMultichainToken({ multichainId: 'mc:eth', symbol: 'ETH' }),
      createRankedMultichainToken({
        multichainId: '',
        symbol: 'USDC.e',
        addresses: { '137': '0x1111111111111111111111111111111111111111' },
      }),
      createRankedMultichainToken({
        multichainId: '',
        symbol: 'WBNB',
        addresses: { '56': '0x2222222222222222222222222222222222222222' },
      }),
    ]
    const { topTokens, tokenSortRank } = processMultichainTokensForDisplay({
      tokens,
      allowedChainIds: ALL_CHAIN_IDS,
    })
    // Singles must not dedupe against each other on the shared '' sentinel...
    expect(topTokens).toHaveLength(3)
    // ...and each gets its own rank, keyed by chainId:address.
    expect(tokenSortRank['mc:eth']).toBe(1)
    expect(tokenSortRank['137:0x1111111111111111111111111111111111111111']).toBe(2)
    expect(tokenSortRank['56:0x2222222222222222222222222222222222222222']).toBe(3)
  })

  it('should dedupe a repeated ungrouped single by its chain and address', () => {
    const tokens = [
      createRankedMultichainToken({
        multichainId: '',
        symbol: 'USDC.e',
        addresses: { '137': '0x1111111111111111111111111111111111111111' },
      }),
      createRankedMultichainToken({
        multichainId: '',
        symbol: 'USDC.e',
        addresses: { '137': '0x1111111111111111111111111111111111111111' },
      }),
    ]
    const { topTokens } = processMultichainTokensForDisplay({
      tokens,
      allowedChainIds: ALL_CHAIN_IDS,
    })
    expect(topTokens).toHaveLength(1)
  })
})
