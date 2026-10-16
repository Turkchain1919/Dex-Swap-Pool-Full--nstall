import type { PositionRewardApr } from 'uniswap/src/features/positions/types'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { rewardCurrencyId, rewardSymbol, sortRewardsByBoost } from '~/features/Liquidity/LPIncentives/utils'

/**
 * The display symbol of the pool's largest boost — the token that copy naming a single reward token
 * ("Earn UNI rewards") should name.
 *
 * The largest boost, not the first served, for the same reason `RewardAprBadge` headlines that one:
 * served order is not a ranking, so taking `rewards[0]` would swap the name a refetch shows. A pool
 * running campaigns in several tokens therefore gets copy naming its biggest, matching the token the
 * badge beside it headlines.
 *
 * Undefined when the pool runs no live campaign, and when neither the token list nor the server can
 * name the token — callers drop the copy rather than print a sentence with a hole in it.
 */
export function useHeadlineRewardSymbol(rewards?: PositionRewardApr[]): string | undefined {
  const headlineReward = rewards?.length ? sortRewardsByBoost(rewards)[0] : undefined
  const currencyInfo = useCurrencyInfo(headlineReward && rewardCurrencyId(headlineReward.token))

  return headlineReward && rewardSymbol(currencyInfo, headlineReward.token)
}
