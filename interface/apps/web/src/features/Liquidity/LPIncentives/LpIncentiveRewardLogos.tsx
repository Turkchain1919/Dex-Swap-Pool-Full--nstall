import { iconSizes } from '@universe/mycelium'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { useCurrencyInfos } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { OverlappingCurrencyLogos } from '~/components/Logo/OverlappingCurrencyLogos'
import type { RewardTokenRef } from '~/features/Liquidity/LPIncentives/buildLpIncentiveRewards'
import { rewardCurrencyId } from '~/features/Liquidity/LPIncentives/utils'

/**
 * Cluster of reward-token logos for the LP-incentive summary surfaces. Resolves the token refs the
 * rewards data carries into currency metadata so the three surfaces don't each repeat it.
 *
 * Network badges are dropped by the shared cluster: logos overlap, so badges collide with the
 * neighbouring token, and the chain is already spelled out per-row inside the rewards modal.
 *
 * The summary surfaces cap the cluster silently; pass `totalCount` to close it with a "+N" chip
 * instead, for surfaces too narrow to imply the remainder.
 */
export function LpIncentiveRewardLogos({
  tokens,
  size = iconSizes.icon24,
  max,
  totalCount,
}: {
  tokens: RewardTokenRef[]
  size?: number
  max?: number
  totalCount?: number
}): JSX.Element {
  const currencyInfos = useCurrencyInfos(tokens.map(rewardCurrencyId))
  const resolved = currencyInfos.filter((currencyInfo): currencyInfo is CurrencyInfo => Boolean(currencyInfo))

  return <OverlappingCurrencyLogos currencyInfos={resolved} size={size} max={max} totalCount={totalCount} />
}
