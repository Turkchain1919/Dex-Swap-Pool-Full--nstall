import { PoolTokenRewards, RewardToken } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { UniverseChainId } from '@universe/chains'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import type { PositionRewardApr } from 'uniswap/src/features/positions/types'
import {
  rewardCurrencyId,
  rewardSymbol,
  sortRewardsByBoost,
  toPoolRewardAprEntries,
} from '~/features/Liquidity/LPIncentives/utils'

const UNI = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

function reward(token: Partial<PositionRewardApr['token']>, boostedPoolApr = 1): PositionRewardApr {
  return {
    token: { chainId: UniverseChainId.Mainnet, address: UNI, isNative: false, ...token },
    boostedPoolApr,
  }
}

describe('rewardCurrencyId', () => {
  it('builds a plain currency id for an ERC-20 reward token', () => {
    expect(rewardCurrencyId(reward({}).token)).toBe(`${UniverseChainId.Mainnet}-${UNI}`)
  })

  it('resolves a native reward token to the chain native id, not the served zero address', () => {
    // The liquidity service reports a native reward token at the zero address. Passing that
    // straight to buildCurrencyId yields an id the token list has no entry for, so the row
    // rendered a blank logo.
    const id = rewardCurrencyId(reward({ address: ZERO_ADDRESS, isNative: true }).token)

    expect(id).not.toBe(`${UniverseChainId.Mainnet}-${ZERO_ADDRESS}`)
    expect(id.toLowerCase()).toBe(`${UniverseChainId.Mainnet}-0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`)
  })

  // A chain the frontend doesn't know has no chain info to read a native address from. The reward
  // surfaces render this id inline, so throwing here would take the whole surface down with it.
  it('falls back to the served address rather than throwing on an unrecognized chain', () => {
    const token = { chainId: 987654, address: ZERO_ADDRESS, isNative: true }

    expect(() => rewardCurrencyId(token)).not.toThrow()
    expect(rewardCurrencyId(token)).toBe(`987654-${ZERO_ADDRESS}`)
  })
})

describe('rewardSymbol', () => {
  const listed = (symbol?: string) => ({ currency: { symbol } }) as CurrencyInfo

  it('prefers the token list over the served symbol', () => {
    expect(rewardSymbol(listed('UNI'), reward({ symbol: 'stale' }).token)).toBe('UNI')
  })

  // Both halves are protobuf string fields, so an unnamed token arrives as '' rather than undefined
  // — `??` would hand a live Collect button a blank label.
  it('falls through an empty served symbol and an unlisted token', () => {
    expect(rewardSymbol(listed(''), reward({ symbol: 'UNI' }).token)).toBe('UNI')
    expect(rewardSymbol(undefined, reward({ symbol: 'UNI' }).token)).toBe('UNI')
    expect(rewardSymbol(listed(''), reward({ symbol: '' }).token)).toBeUndefined()
    expect(rewardSymbol(undefined, reward({}).token)).toBeUndefined()
  })
})

describe('sortRewardsByBoost', () => {
  const boosts = (rewards: PositionRewardApr[]): number[] => rewards.map((entry) => entry.boostedPoolApr)

  it('leads with the largest boost, whichever order it arrived in', () => {
    const small = reward({ address: USDC }, 1)
    const large = reward({ address: UNI }, 20)

    expect(boosts(sortRewardsByBoost([small, large]))).toEqual([20, 1])
    expect(boosts(sortRewardsByBoost([large, small]))).toEqual([20, 1])
  })

  // Equal boosts still have to resolve the same way every time, or the headline goes back to being
  // whatever the service serialized first.
  it('breaks a tie on currency id rather than served order', () => {
    const uni = reward({ address: UNI }, 5)
    const usdc = reward({ address: USDC }, 5)

    expect(sortRewardsByBoost([uni, usdc])).toEqual(sortRewardsByBoost([usdc, uni]))
  })

  it('leaves the caller’s array alone', () => {
    const served = [reward({ address: USDC }, 1), reward({ address: UNI }, 20)]

    sortRewardsByBoost(served)

    expect(boosts(served)).toEqual([1, 20])
  })
})

describe('toPoolRewardAprEntries', () => {
  const usdcRewards = (overrides: Partial<PoolTokenRewards> = {}): PoolTokenRewards =>
    new PoolTokenRewards({
      token: new RewardToken({ chainId: 1, address: USDC, symbol: 'USDC', decimals: 6, isNative: false }),
      boostedApr: 4.5,
      ...overrides,
    })

  // `token_rewards` is grouped by the token it pays and each `boostedApr` is already that token's
  // summed live campaigns, so the mapping is one entry per served denomination — never collapsed
  // together, never split per campaign.
  it('carries one entry per reward denomination', () => {
    const uni = usdcRewards({
      token: new RewardToken({ chainId: 1, address: UNI, symbol: 'UNI', decimals: 18, isNative: false }),
      boostedApr: 1.25,
    })

    const entries = toPoolRewardAprEntries([usdcRewards(), uni])

    expect(entries.map((entry) => entry.boostedPoolApr)).toEqual([4.5, 1.25])
    expect(entries.map((entry) => entry.token.address)).toEqual([USDC, UNI])
  })

  it('drops an ended campaign and a reward with no token', () => {
    expect(toPoolRewardAprEntries([usdcRewards({ boostedApr: 0 })])).toEqual([])
    expect(toPoolRewardAprEntries([new PoolTokenRewards({ boostedApr: 4.5 })])).toEqual([])
  })

  it('resolves a native reward token rather than dropping it at the zero address', () => {
    const native = usdcRewards({
      token: new RewardToken({ chainId: 1, address: ZERO_ADDRESS, symbol: 'ETH', isNative: true }),
    })

    const [entry] = toPoolRewardAprEntries([native])

    // buildRewardCurrency maps native to the chain's currency, so the address that reaches the
    // token-list lookup is the native one rather than the zero address the server sent.
    expect(entry.token.isNative).toBe(true)
    expect(entry.token.address).not.toBe(ZERO_ADDRESS)
  })

  it('is empty when the pool runs no campaign', () => {
    expect(toPoolRewardAprEntries(undefined)).toEqual([])
  })
})
