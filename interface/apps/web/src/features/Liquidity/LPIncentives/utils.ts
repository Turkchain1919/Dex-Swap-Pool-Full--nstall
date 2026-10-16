import type { PlainMessage } from '@bufbuild/protobuf'
import type { PoolTokenBoost } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import type { PoolTokenRewards } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import type { Currency } from '@uniswap/sdk-core'
import type { UniverseChainId } from '@universe/chains'
import { isUniverseChainId } from 'uniswap/src/features/chains/utils'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import type { PositionRewardApr } from 'uniswap/src/features/positions/types'
import { buildCurrencyId, buildNativeCurrencyId, currencyAddress } from 'uniswap/src/utils/currencyId'
import { buildRewardCurrency } from '~/data/pools/parseLiquidityServicePool'

/**
 * A reward token's currency id, for the token-list lookups every reward surface does.
 *
 * Honours `isNative`, which the served shape carries and a bare `buildCurrencyId` ignores: the
 * liquidity service reports a native reward token at the zero address, which is not the chain's
 * native currency id, so resolving it directly returns nothing and the logo renders blank.
 */
export function rewardCurrencyId(token: PositionRewardApr['token']): string {
  const chainId = token.chainId as UniverseChainId
  // Chain-checked before resolving a native address: an unrecognized served chain has no chain info
  // to read one from, and `buildNativeCurrencyId` would throw mid-render rather than return nothing.
  // The plain id matches no token-list entry either, but it degrades to a blank logo instead.
  return token.isNative && isUniverseChainId(chainId)
    ? buildNativeCurrencyId(chainId)
    : buildCurrencyId(chainId, token.address)
}

/**
 * A reward token's display symbol: the token list's, then the served one.
 *
 * `||`, not `??`: `token.symbol` is a protobuf string field, so a token the backend couldn't name
 * arrives as '' rather than undefined. Undefined when neither knows it — a caller whose slot needs
 * something visible supplies its own placeholder.
 */
export function rewardSymbol(currencyInfo: Maybe<CurrencyInfo>, token: PositionRewardApr['token']): string | undefined {
  return currencyInfo?.currency.symbol || token.symbol || undefined
}

/**
 * The pool's boosts, largest first, tie-broken on currency id.
 *
 * Served order is not a ranking: the parser copies the protobuf repeated field as it arrives, and
 * `PoolAprTooltip` keys its rows by token rather than index precisely because the same pool can come
 * back in another order. So a surface with room for one figure can't take `rewards[0]` — a refetch
 * would swap the figure, symbol and tint for no reason a user could see, and the same list could
 * headline a 1% token while a 20% one sat under the "+N".
 */
export function sortRewardsByBoost(rewards: PositionRewardApr[]): PositionRewardApr[] {
  return [...rewards].sort(
    (a, b) => b.boostedPoolApr - a.boostedPoolApr || rewardCurrencyId(a.token).localeCompare(rewardCurrencyId(b.token)),
  )
}

/**
 * Adapts one bare reward APR and the token it's denominated in into the per-token `rewards[]` shape
 * `PoolAprTooltip` speaks, so surfaces carrying a single reward number share one reward model with
 * the per-token positions table.
 */
export function toRewardAprEntries(boostedPoolApr: number, token: Currency): PositionRewardApr[] {
  return [
    {
      token: {
        chainId: token.chainId,
        address: currencyAddress(token),
        symbol: token.symbol,
        decimals: token.decimals,
        isNative: token.isNative,
      },
      boostedPoolApr,
    },
  ]
}

/**
 * The pool's live per-token boosts as data.v2 `ListPools` serves them (`PoolRankStats.token_boosts`),
 * in the one reward shape the display surfaces speak.
 *
 * Same bar as `toPoolRewardAprEntries`: a boost is worth an entry once the server has named its
 * token and its campaigns are still live. Mapped straight off the served token rather than through
 * `buildRewardCurrency` — a boost needs no decimals to render, so a token the token list doesn't
 * carry still gets its badge, and `rewardCurrencyId` resolves the native case off `isNative`.
 */
export function toTokenBoostRewardAprEntries(boosts?: PlainMessage<PoolTokenBoost>[]): PositionRewardApr[] {
  // Protobuf JSON omits empty repeated fields, so this is absent whenever the pool runs no campaign.
  const served = boosts ?? []

  return served.flatMap(({ token, apr }) => {
    if (!token || apr <= 0) {
      return []
    }
    // Copied field by field rather than spread: `token` can be a protobuf Message instance, so
    // spreading it would drop its prototype and drag its internals into the domain object.
    const { chainId, address, symbol, decimals, isNative } = token
    return [{ token: { chainId, address, symbol, decimals, isNative }, boostedPoolApr: apr }]
  })
}

/**
 * The pool's live per-token boosts as the liquidity service serves them, in the one reward shape the
 * display surfaces speak.
 *
 * Routed through `buildRewardCurrency` rather than the served address so a native reward token —
 * which arrives at the zero address — resolves to the chain's native currency rather than nothing.
 * A boost is worth an entry once the server has named its token and its campaigns are still live.
 */
export function toPoolRewardAprEntries(rewards?: PlainMessage<PoolTokenRewards>[]): PositionRewardApr[] {
  // Protobuf JSON omits empty repeated fields, so this is absent whenever the pool runs no campaign.
  const served = rewards ?? []

  return served.flatMap((reward) => {
    const currency = buildRewardCurrency(reward.token)
    return currency && reward.boostedApr > 0 ? toRewardAprEntries(reward.boostedApr, currency) : []
  })
}
