import type { PlainMessage } from '@bufbuild/protobuf'
import type { RewardBalance, Token } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { type Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { isUniverseChainId } from 'uniswap/src/features/chains/utils'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { buildCurrency, buildCurrencyInfo } from 'uniswap/src/features/dataApi/utils/buildCurrency'
import { useCurrencyInfos } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { normalizeCurrencyIdForMapLookup } from 'uniswap/src/utils/currencyId'
import { logger } from 'utilities/src/logger/logger'
import { rewardCurrencyId } from '~/features/Liquidity/LPIncentives/utils'

/** A position reward balance narrowed to the ones that can be rendered: token present, chain known. */
export type PositionRewardBalance = PlainMessage<RewardBalance> & { token: PlainMessage<Token> }

export interface PositionRewardEarning {
  currencyInfo: CurrencyInfo
  currencyAmount: CurrencyAmount<Currency>
  /** USD value carried by the balance. Unset when the backend couldn't price the token. */
  usdValue?: number
}

const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1)

function hasRenderableToken(balance: PlainMessage<RewardBalance>): balance is PositionRewardBalance {
  const { token } = balance
  if (token === undefined || !isUniverseChainId(token.chainId)) {
    return false
  }
  try {
    // Built with the same call the hook below makes, rather than pattern-matching the address, so the
    // two can't disagree about what's renderable. Guarded because `buildCurrency` *throws* on a
    // malformed address instead of returning undefined — unguarded, one takes the whole page's render
    // with it. Decimals don't bear on whether a Currency can be built, so the served value is enough.
    return Boolean(
      buildCurrency({
        chainId: token.chainId,
        address: token.isNative ? undefined : token.address,
        decimals: token.decimals,
      }),
    )
  } catch {
    return false
  }
}

function hasRenderableAmount(balance: PositionRewardBalance): boolean {
  try {
    const amount = BigInt(balance.unclaimedAmount)
    // Bounded, not just positive: over MaxUint256 the SDK's CurrencyAmount invariant rejects it, so
    // it could never become a row however far it got.
    return amount > BigInt(0) && amount <= MAX_UINT256
  } catch {
    // A non-numeric amount can't be rendered as one; treat it as nothing earned rather than
    // letting BigInt throw through the render.
    return false
  }
}

// Defence in depth behind the selector, which already rejects what this would catch. Kept so a
// future change to either side degrades one row and logs rather than blanking the position page.
function safeFromRawAmount(currency: Currency, rawAmount: string): CurrencyAmount<Currency> | undefined {
  try {
    return CurrencyAmount.fromRawAmount(currency, rawAmount)
  } catch {
    logger.warn(
      'LPIncentives/hooks/usePositionRewardEarnings.ts',
      'safeFromRawAmount',
      'Unparseable reward balance amount',
      { rawAmount, currency: currency.symbol },
    )
    return undefined
  }
}

/**
 * The reward balances on a position that are worth rendering, ordered highest USD value first so a
 * refetch that reorders the backend array doesn't reshuffle the rows or the bar segments.
 *
 * The single gate on what a position's rewards are: `useLpIncentivesFormattedEarnings` sums this
 * list into the earnings headline while `usePositionRewardEarnings` turns it into the rows and bar
 * segments, so anything rejected downstream instead of here would show up in the total with no row
 * to account for it. Both disqualifiers — a token no Currency can be built from, an amount no
 * CurrencyAmount can hold — are decided from the balance alone and belong up here.
 *
 * No dust filter, unlike the wallet-level rewards modal: this is a statement of what the position
 * has earned, not a list of things worth paying gas to claim, so a sub-cent reward still belongs.
 * Unpriced rewards (`unclaimedAmountUsd` unset) are kept and sorted last — dropping them would hide
 * a real balance because we happen not to know its price.
 */
export function selectPositionRewardBalances(
  balances: PlainMessage<RewardBalance>[] | undefined,
): PositionRewardBalance[] {
  return (balances ?? [])
    .filter(hasRenderableToken)
    .filter(hasRenderableAmount)
    .sort(
      (a, b) =>
        // Unpriced sorts last; address breaks ties so equal-value rewards keep a stable order too.
        (b.unclaimedAmountUsd ?? -1) - (a.unclaimedAmountUsd ?? -1) || a.token.address.localeCompare(b.token.address),
    )
}

/**
 * Resolves reward balances into rows the earnings surfaces can render: token metadata from our token
 * list where we have it, and the unclaimed amount in that token's own units.
 *
 * Identity and amounts come entirely from the balance data — nothing here assumes a denomination.
 *
 * The token-list lookup is not redundant with the served token, despite that carrying symbol,
 * decimals and name: nothing populates `Token.logo` on either the data-api or liquidity-service
 * reward path today, so the list is the only source of a logo. Every sibling reward surface
 * (the logo clusters, the rewards modal, PoolAprTooltip, the APR badges) resolves the same way, and
 * the query is deduped, so the tokens on this page are already in flight. Drop it once the backend
 * serves a logo.
 */
export function usePositionRewardEarnings(rewardBalances: PositionRewardBalance[]): PositionRewardEarning[] {
  const currencyIds = useMemo(
    // rewardCurrencyId, not the raw address: a native reward token arrives at the zero address, and
    // an id built from that matches no token-list entry, so the row lost its logo.
    () => rewardBalances.map((balance) => rewardCurrencyId(balance.token)),
    [rewardBalances],
  )
  const currencyInfos = useCurrencyInfos(currencyIds)

  // Resolved by currencyId rather than by position: the token-list lookup isn't guaranteed to return
  // an entry per input, and pairing the wrong metadata with an amount would mislabel a balance.
  const resolvedInfos = useMemo(() => {
    const byCurrencyId = new Map<string, CurrencyInfo>()
    currencyInfos.forEach((currencyInfo) => {
      if (currencyInfo) {
        byCurrencyId.set(normalizeCurrencyIdForMapLookup(currencyInfo.currencyId), currencyInfo)
      }
    })
    return currencyIds.map((currencyId) => byCurrencyId.get(normalizeCurrencyIdForMapLookup(currencyId)))
  }, [currencyIds, currencyInfos])

  return useMemo(
    () =>
      rewardBalances.flatMap((balance, index) => {
        const { token } = balance
        const resolved = resolvedInfos[index]
        // The balance's own decimals are the ones its raw amount was denominated in, so they take
        // precedence over the token list's when the two disagree — except at 0. `Token.decimals` is a
        // presence-less uint32, so an omitted field arrives as 0, indistinguishable from a genuine
        // 0-decimal token; scaling by the wrong power of ten renders a raw integer beside a correct
        // USD figure. The list breaks that tie, and a served 0 stands only when it has no entry.
        const decimals = token.decimals || resolved?.currency.decimals || 0
        const currency = buildCurrency({
          chainId: token.chainId,
          // Omitted for a native reward, which is how buildCurrency is asked for the chain's native
          // currency. Passing the served zero address builds a token at that address instead.
          address: token.isNative ? undefined : token.address,
          decimals,
          symbol: token.symbol || resolved?.currency.symbol,
          name: token.name || resolved?.currency.name,
        })

        if (!currency) {
          return []
        }

        const currencyAmount = safeFromRawAmount(currency, balance.unclaimedAmount)
        if (!currencyAmount) {
          return []
        }

        const currencyId = currencyIds[index]
        return [
          {
            // Falls back to the logo the balance itself carries, so an unlisted reward token still
            // gets a logo rather than the letter placeholder.
            currencyInfo:
              resolved ?? buildCurrencyInfo({ currency, currencyId, logoUrl: token.logo ?? null, isSpam: false }),
            currencyAmount,
            usdValue: balance.unclaimedAmountUsd,
          },
        ]
      }),
    [rewardBalances, currencyIds, resolvedInfos],
  )
}
