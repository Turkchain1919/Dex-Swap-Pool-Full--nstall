import type { PlainMessage } from '@bufbuild/protobuf'
import type { RankedPool } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { Currency, Fraction } from '@uniswap/sdk-core'
import { AddressStringFormat, areEvmAddressesEqual, normalizeAddress } from '@universe/chains'
import JSBI from 'jsbi'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { nativeOnChain } from 'uniswap/src/constants/tokens'
import { getPriceFromSqrtPriceX96 } from 'uniswap/src/features/positions/poolPriceDivergence'
import { getWrappedTokenIfExists } from 'uniswap/src/utils/currency'

export interface ListPoolsAddressPair {
  token0: string
  token1: string
}

function toRestAddress(currency: Currency): string {
  return currency.isNative ? ZERO_ADDRESS : currency.address
}

/**
 * The opposite native/wrapped representation of a currency, when one exists. Chains with no
 * wrapped native (Arc, Tempo) have no alternate representation for either branch, which
 * `getWrappedTokenIfExists` reports as undefined.
 */
function toAlternateRestAddress(currency: Currency): string | undefined {
  const wrappedNative = getWrappedTokenIfExists(nativeOnChain(currency.chainId))

  if (currency.isNative) {
    return wrappedNative?.address
  }

  return wrappedNative && currency.equals(wrappedNative) ? ZERO_ADDRESS : undefined
}

/**
 * Emits each pair in a canonical address-sorted order. data.v2 `ListPools` matches an unordered
 * token set (`PoolTokenFilter` with the AND operator), so ordering no longer affects which pools
 * match — the sort is kept only to keep the emitted pair, and thus the query's cache key, stable
 * regardless of the caller's token argument order.
 */
function toSortedPair(pair: ListPoolsAddressPair): ListPoolsAddressPair {
  return normalizeAddress(pair.token0, AddressStringFormat.Lowercase) <
    normalizeAddress(pair.token1, AddressStringFormat.Lowercase)
    ? pair
    : { token0: pair.token1, token1: pair.token0 }
}

/**
 * Address pairs to query ListPools with for a pool's token pair. The data api indexes v4 native
 * pools under the zero address and v2/v3 pools under the wrapped native address, so pairs involving
 * (wrapped) native need a second query with the alternate representation. Each pair is emitted in a
 * canonical sorted order (see {@link toSortedPair}).
 */
export function getListPoolsAddressPairs({
  token0,
  token1,
}: {
  token0: Currency
  token1: Currency
}): ListPoolsAddressPair[] {
  const primary = { token0: toRestAddress(token0), token1: toRestAddress(token1) }
  const alternate0 = toAlternateRestAddress(token0)
  const alternate1 = toAlternateRestAddress(token1)
  // Both alternates only happens for a native/wrapped-native pair, where the flipped pair is the same pair
  if ((alternate0 === undefined) === (alternate1 === undefined)) {
    return [toSortedPair(primary)]
  }

  return [
    toSortedPair(primary),
    // Substituting the wrapped representation into a sorted pair can unsort it (e.g. native/USDC →
    // WETH/USDC with WETH > USDC), so sort after substituting
    toSortedPair({ token0: alternate0 ?? primary.token0, token1: alternate1 ?? primary.token1 }),
  ]
}

/** The data api uses the zero address for native currency; it matches both native and wrapped-native own currencies. */
function matchesCurrency({ address, currency }: { address: string; currency: Currency }): boolean {
  if (areEvmAddressesEqual(address, ZERO_ADDRESS)) {
    return currency.isNative || toAlternateRestAddress(currency) === ZERO_ADDRESS
  }

  // A native currency with no wrapped counterpart (see toAlternateRestAddress above) can never
  // match a non-zero address — it has no wrapped address to compare against.
  const wrapped = getWrappedTokenIfExists(currency)
  return wrapped ? areEvmAddressesEqual(address, wrapped.address) : false
}

type PairOrientation = 'direct' | 'inverted'

function getPairOrientation({
  poolToken0,
  poolToken1,
  token0,
  token1,
}: {
  poolToken0: string
  poolToken1: string
  token0: Currency
  token1: Currency
}): PairOrientation | undefined {
  if (
    matchesCurrency({ address: poolToken0, currency: token0 }) &&
    matchesCurrency({ address: poolToken1, currency: token1 })
  ) {
    return 'direct'
  }

  if (
    matchesCurrency({ address: poolToken0, currency: token1 }) &&
    matchesCurrency({ address: poolToken1, currency: token0 })
  ) {
    return 'inverted'
  }

  return undefined
}

/** The pool's active in-range liquidity as a bigint, or undefined when zero or malformed. */
function parseNonzeroLiquidity(liquidity: string): JSBI | undefined {
  try {
    const parsed = JSBI.BigInt(liquidity)
    return JSBI.greaterThan(parsed, JSBI.BigInt(0)) ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Minimum USD TVL for a sibling reference to be trusted for substitution and status flips. The
 * badge flip and the displayed price change what a user believes about their funds, so trust
 * requires non-dust TVL — a floor a few dollars of narrow-range liquidity can't buy. Below it the
 * sibling stays detection-only (the warning icon still works).
 */
export const MIN_TRUSTED_SIBLING_TVL_USD = 1000

export interface SiblingPoolPrice {
  /** Decimal-adjusted token1-per-token0 price in the caller's token0/token1 orientation. */
  price: Fraction
  /**
   * True when the winning pool reported at least {@link MIN_TRUSTED_SIBLING_TVL_USD} of USD TVL.
   * A reference below the floor (dust TVL, or a raw-liquidity winner on a USD-unpriced pair) is
   * cheap to capture with a narrow-range mint at an arbitrary price, so callers must treat it as
   * detection-only: never display it or flip a status off it.
   */
  hasTrustedTvl: boolean
}

/**
 * Price of the given token pair implied by the most liquid same-pair pool — ranked by USD TVL,
 * tie-broken by in-range liquidity — excluding the position's own pool and pools with no active
 * liquidity. Undefined when no sibling pool exists; see {@link SiblingPoolPrice.hasTrustedTvl}
 * for how far the returned price may be trusted.
 */
export function getMostLiquidSiblingPoolPrice({
  pools,
  ownPoolId,
  token0,
  token1,
}: {
  pools: PlainMessage<RankedPool>[]
  ownPoolId: string
  token0: Currency
  token1: Currency
}): SiblingPoolPrice | undefined {
  let best: SiblingPoolPrice | undefined
  let bestTvl = 0
  let bestLiquidity = JSBI.BigInt(0)

  for (const { pool, stats } of pools) {
    if (!pool) {
      continue
    }
    // data.v2 leaves liquidity optional; an absent value is treated the same as zero/malformed.
    const liquidity = parseNonzeroLiquidity(pool.liquidity ?? '')
    // poolIds are v3 pool addresses or v4 32-byte hashes; areEvmAddressesEqual is a pure
    // case-insensitive hex compare, so both shapes keep exact equality semantics
    if (areEvmAddressesEqual(pool.poolId, ownPoolId) || liquidity === undefined) {
      continue
    }

    const orientation = getPairOrientation({
      poolToken0: pool.token0?.address ?? '',
      poolToken1: pool.token1?.address ?? '',
      token0,
      token1,
    })
    if (!orientation) {
      continue
    }

    const [base, quote] = orientation === 'direct' ? [token0, token1] : [token1, token0]
    const price = getPriceFromSqrtPriceX96({
      sqrtPriceX96: pool.sqrtPriceX96 ?? '',
      token0Decimals: base.decimals,
      token1Decimals: quote.decimals,
    })
    if (!price) {
      continue
    }

    // data.v2 serves USD TVL as a numeric stat; unpriced pairs omit it, so an absent or non-finite
    // value counts as 0 and ties break on in-range liquidity rather than response order.
    const tvl = stats?.tvl !== undefined && Number.isFinite(stats.tvl) ? stats.tvl : 0
    // Unpriced pairs report no USD TVL (every candidate parses to 0), so break ties on in-range
    // liquidity rather than letting response order pick the reference
    const isBetter =
      best === undefined || tvl > bestTvl || (tvl === bestTvl && JSBI.greaterThan(liquidity, bestLiquidity))
    if (isBetter) {
      best = {
        price: orientation === 'direct' ? price : price.invert(),
        hasTrustedTvl: tvl >= MIN_TRUSTED_SIBLING_TVL_USD,
      }
      bestTvl = tvl
      bestLiquidity = liquidity
    }
  }

  return best
}
