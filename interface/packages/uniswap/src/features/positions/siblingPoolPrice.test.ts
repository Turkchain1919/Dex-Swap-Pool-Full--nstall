import type { PlainMessage } from '@bufbuild/protobuf'
import type { RankedPool } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { Token } from '@uniswap/sdk-core'
import { encodeSqrtRatioX96 } from '@uniswap/v3-sdk'
import { UniverseChainId } from '@universe/chains'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { DAI, nativeOnChain } from 'uniswap/src/constants/tokens'
import {
  getListPoolsAddressPairs,
  getMostLiquidSiblingPoolPrice,
  MIN_TRUSTED_SIBLING_TVL_USD,
} from 'uniswap/src/features/positions/siblingPoolPrice'
import { WETH } from 'uniswap/src/test/fixtures/lib/sdk'
import { describe, expect, it } from 'vitest'

const ETH = nativeOnChain(UniverseChainId.Mainnet)
const USDC_LIKE = new Token(UniverseChainId.Mainnet, '0x00000000000000000000000000000000000000A1', 6, 'USDC')
// Arc's native currency has no wrapped-native counterpart at all (WRAPPED_NATIVE_CURRENCY has no
// entry for it) — `.wrapped` throws "Unsupported chain ID" for this chain rather than returning a
// token. Regression coverage for that (see toAlternateRestAddress/matchesCurrency in siblingPoolPrice.ts).
const NATIVE_NO_WRAPPED = nativeOnChain(UniverseChainId.Arc)
const ARC_ERC20 = new Token(UniverseChainId.Arc, '0x00000000000000000000000000000000000000B2', 6, 'USDC')

const OWN_POOL_ID = '0x000000000000000000000000000000000000dEaD'

// A data.v2 `ListPools` item (`RankedPool`) with only the fields getMostLiquidSiblingPoolPrice reads.
function buildRankedPool(
  overrides: {
    poolId?: string
    token0?: string
    token1?: string
    sqrtPriceX96?: string
    liquidity?: string
    tvl?: number
  } = {},
): PlainMessage<RankedPool> {
  return {
    pool: {
      poolId: overrides.poolId ?? '0x0000000000000000000000000000000000000001',
      token0: { address: overrides.token0 ?? DAI.address },
      token1: { address: overrides.token1 ?? WETH.address },
      sqrtPriceX96: overrides.sqrtPriceX96 ?? encodeSqrtRatioX96(2, 1).toString(),
      liquidity: overrides.liquidity ?? '1000',
    },
    stats: { tvl: overrides.tvl ?? 100 },
  } as unknown as PlainMessage<RankedPool>
}

describe('getListPoolsAddressPairs', () => {
  // ListPools matches the pair order-sensitively (a reversed pair returns no pools), so every
  // emitted pair must come out sorted by address regardless of the input order.
  it('returns a single sorted pair for two erc20 tokens', () => {
    // USDC_LIKE sorts before DAI: the pair is emitted sorted even though the inputs are not
    expect(getListPoolsAddressPairs({ token0: DAI, token1: USDC_LIKE })).toEqual([
      { token0: USDC_LIKE.address, token1: DAI.address },
    ])
    expect(getListPoolsAddressPairs({ token0: USDC_LIKE, token1: DAI })).toEqual([
      { token0: USDC_LIKE.address, token1: DAI.address },
    ])
  })

  it('adds the wrapped representation for a native token, sorted', () => {
    expect(getListPoolsAddressPairs({ token0: ETH, token1: DAI })).toEqual([
      { token0: ZERO_ADDRESS, token1: DAI.address },
      // DAI sorts before WETH: the raw alternate (WETH, DAI) must be re-sorted
      { token0: DAI.address, token1: WETH.address },
    ])
  })

  it('re-sorts the wrapped alternate when the other token sorts before wrapped native', () => {
    // Native/USDC-like: substituting WETH for native unsorts the pair (WETH > USDC-like)
    expect(getListPoolsAddressPairs({ token0: ETH, token1: USDC_LIKE })).toEqual([
      { token0: ZERO_ADDRESS, token1: USDC_LIKE.address },
      { token0: USDC_LIKE.address, token1: WETH.address },
    ])
  })

  it('adds the native representation for the wrapped native token, sorted', () => {
    expect(getListPoolsAddressPairs({ token0: WETH, token1: DAI })).toEqual([
      { token0: DAI.address, token1: WETH.address },
      { token0: ZERO_ADDRESS, token1: DAI.address },
    ])
  })

  it('does not add an alternate for a native/wrapped-native pair', () => {
    expect(getListPoolsAddressPairs({ token0: ETH, token1: WETH })).toEqual([
      { token0: ZERO_ADDRESS, token1: WETH.address },
    ])
  })

  // Arc-chain regression: NATIVE_NO_WRAPPED.wrapped throws (no WRAPPED_NATIVE_CURRENCY entry for
  // Arc), so this must not throw and must fall back to the primary pair alone.
  it('does not throw and skips the alternate for a native currency with no wrapped counterpart', () => {
    expect(getListPoolsAddressPairs({ token0: NATIVE_NO_WRAPPED, token1: ARC_ERC20 })).toEqual([
      { token0: ZERO_ADDRESS, token1: ARC_ERC20.address },
    ])
  })
})

describe('getMostLiquidSiblingPoolPrice', () => {
  it('returns undefined when there are no pools', () => {
    expect(getMostLiquidSiblingPoolPrice({ pools: [], ownPoolId: OWN_POOL_ID, token0: DAI, token1: WETH })).toBe(
      undefined,
    )
  })

  it('excludes the position own pool regardless of address casing', () => {
    const pools = [buildRankedPool({ poolId: OWN_POOL_ID.toLowerCase() })]
    expect(getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: DAI, token1: WETH })).toBe(undefined)
  })

  it('excludes the position own pool for 66-char v4 pool ids regardless of casing', () => {
    // The real ETH/GUY v4 pool id — a 32-byte hash, not a 20-byte address. Pins that the
    // exclusion compare keeps working for this shape even if the address helpers ever gain
    // 20-byte validation.
    const v4PoolId = '0x8e51f963eda6b9c6609432f26f5c5d7691279ee2a005f20beb3ef14b7a3440ee'
    const pools = [buildRankedPool({ poolId: `0x${v4PoolId.slice(2).toUpperCase()}` })]
    expect(getMostLiquidSiblingPoolPrice({ pools, ownPoolId: v4PoolId, token0: DAI, token1: WETH })).toBe(undefined)
  })

  it('excludes pools with zero liquidity', () => {
    const pools = [buildRankedPool({ liquidity: '0', tvl: 1000000 })]
    expect(getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: DAI, token1: WETH })).toBe(undefined)
  })

  it('excludes pools of a different token pair', () => {
    const pools = [buildRankedPool({ token1: USDC_LIKE.address })]
    expect(getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: DAI, token1: WETH })).toBe(undefined)
  })

  it('excludes pools with a malformed or zero sqrt price', () => {
    const pools = [buildRankedPool({ sqrtPriceX96: '0' }), buildRankedPool({ sqrtPriceX96: '' })]
    expect(getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: DAI, token1: WETH })).toBe(undefined)
  })

  it('picks the highest-TVL matching pool', () => {
    const pools = [
      buildRankedPool({ poolId: '0x0000000000000000000000000000000000000002', tvl: 100 }),
      buildRankedPool({
        poolId: '0x0000000000000000000000000000000000000003',
        sqrtPriceX96: encodeSqrtRatioX96(3, 1).toString(),
        tvl: 5000.5,
      }),
    ]
    const price = getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: DAI, token1: WETH })
    expect(price?.price.toSignificant(6)).toBe('3')
    // A TVL-ranked winner is trusted for substitution and status flips
    expect(price?.hasTrustedTvl).toBe(true)
  })

  it('trusts the reference only at or above the TVL floor', () => {
    const below = getMostLiquidSiblingPoolPrice({
      pools: [buildRankedPool({ tvl: MIN_TRUSTED_SIBLING_TVL_USD - 0.01 })],
      ownPoolId: OWN_POOL_ID,
      token0: DAI,
      token1: WETH,
    })
    // Dust TVL is attacker-affordable: detection-only
    expect(below?.hasTrustedTvl).toBe(false)
    expect(below?.price.toSignificant(6)).toBe('2')

    const atFloor = getMostLiquidSiblingPoolPrice({
      pools: [buildRankedPool({ tvl: MIN_TRUSTED_SIBLING_TVL_USD })],
      ownPoolId: OWN_POOL_ID,
      token0: DAI,
      token1: WETH,
    })
    expect(atFloor?.hasTrustedTvl).toBe(true)
  })

  it('breaks TVL ties on in-range liquidity instead of response order', () => {
    // Unpriced pairs report no USD TVL (unset parses to 0): the deeper in-range pool must win
    // even when it comes later in the merged response
    const pools = [
      buildRankedPool({
        poolId: '0x0000000000000000000000000000000000000002',
        tvl: 0,
        liquidity: '10',
      }),
      buildRankedPool({
        poolId: '0x0000000000000000000000000000000000000003',
        tvl: 0,
        liquidity: '5000',
        sqrtPriceX96: encodeSqrtRatioX96(3, 1).toString(),
      }),
    ]
    const price = getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: DAI, token1: WETH })
    expect(price?.price.toSignificant(6)).toBe('3')
    // A liquidity-only winner is detection-only: cheap to capture with a narrow-range mint
    expect(price?.hasTrustedTvl).toBe(false)
    // Same pools in the opposite order: the pick must not change
    const reversed = getMostLiquidSiblingPoolPrice({
      pools: [...pools].reverse(),
      ownPoolId: OWN_POOL_ID,
      token0: DAI,
      token1: WETH,
    })
    expect(reversed?.price.toSignificant(6)).toBe('3')
  })

  it('ranks TVL above in-range liquidity when TVL is available', () => {
    const pools = [
      buildRankedPool({
        poolId: '0x0000000000000000000000000000000000000002',
        tvl: 0,
        liquidity: '999999999',
        sqrtPriceX96: encodeSqrtRatioX96(3, 1).toString(),
      }),
      buildRankedPool({
        poolId: '0x0000000000000000000000000000000000000003',
        tvl: 100,
        liquidity: '1',
      }),
    ]
    const price = getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: DAI, token1: WETH })
    expect(price?.price.toSignificant(6)).toBe('2')
  })

  it('inverts the price when the pool lists the pair in the opposite order', () => {
    const pools = [
      buildRankedPool({
        token0: WETH.address,
        token1: DAI.address,
        sqrtPriceX96: encodeSqrtRatioX96(1, 4).toString(),
      }),
    ]
    const price = getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: DAI, token1: WETH })
    expect(price?.price.toSignificant(6)).toBe('4')
  })

  it('adjusts for differing token decimals', () => {
    // 1 DAI (18 decimals) = 2000 USDC (6 decimals)
    const pools = [
      buildRankedPool({
        token1: USDC_LIKE.address,
        sqrtPriceX96: encodeSqrtRatioX96('2000000000', '1000000000000000000').toString(),
      }),
    ]
    const price = getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: DAI, token1: USDC_LIKE })
    expect(price?.price.toSignificant(6)).toBe('2000')
  })

  it('matches the zero address against a native own currency', () => {
    const pools = [buildRankedPool({ token0: ZERO_ADDRESS, token1: DAI.address })]
    const price = getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: ETH, token1: DAI })
    expect(price?.price.toSignificant(6)).toBe('2')
  })

  it('matches the zero address against a wrapped-native own currency', () => {
    const pools = [buildRankedPool({ token0: ZERO_ADDRESS, token1: DAI.address })]
    const price = getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: WETH, token1: DAI })
    expect(price?.price.toSignificant(6)).toBe('2')
  })

  it('matches the wrapped native address against a native own currency', () => {
    const pools = [buildRankedPool({ token0: WETH.address, token1: DAI.address })]
    const price = getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: ETH, token1: DAI })
    expect(price?.price.toSignificant(6)).toBe('2')
  })

  // Arc-chain regression: a candidate pool's non-zero address can never match
  // NATIVE_NO_WRAPPED (it has no wrapped address to compare against) — this must not throw.
  it('does not throw and does not match a non-zero address against a native currency with no wrapped counterpart', () => {
    const pools = [buildRankedPool({ token0: ARC_ERC20.address, token1: DAI.address })]
    expect(() =>
      getMostLiquidSiblingPoolPrice({ pools, ownPoolId: OWN_POOL_ID, token0: NATIVE_NO_WRAPPED, token1: DAI }),
    ).not.toThrow()
    const price = getMostLiquidSiblingPoolPrice({
      pools,
      ownPoolId: OWN_POOL_ID,
      token0: NATIVE_NO_WRAPPED,
      token1: DAI,
    })
    expect(price).toBe(undefined)
  })

  // Positive-path counterpart to the regression above: the zero address must still match a
  // native currency with no wrapped counterpart via the `currency.isNative` shortcut in
  // matchesCurrency, which never calls `.wrapped` and so never hits the Arc/Tempo throw. Pins
  // this so a future refactor of that branch can't silently stop matching Arc pools while the
  // no-throw regression test above stays green.
  it('matches the zero address against a native currency with no wrapped counterpart', () => {
    const pools = [buildRankedPool({ token0: ZERO_ADDRESS, token1: DAI.address })]
    const price = getMostLiquidSiblingPoolPrice({
      pools,
      ownPoolId: OWN_POOL_ID,
      token0: NATIVE_NO_WRAPPED,
      token1: DAI,
    })
    expect(price?.price.toSignificant(6)).toBe('2')
  })
})
