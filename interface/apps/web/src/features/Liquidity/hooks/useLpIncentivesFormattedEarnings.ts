import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { type Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { PositionInfo } from 'uniswap/src/features/positions/types'
import { NumberType } from 'utilities/src/format/types'
import type { PositionRewardBalance } from '~/features/Liquidity/LPIncentives/hooks/usePositionRewardEarnings'
import { selectPositionRewardBalances } from '~/features/Liquidity/LPIncentives/hooks/usePositionRewardEarnings'

interface UseLpIncentivesFormattedEarningsProps {
  liquidityPosition: PositionInfo
  fiatFeeValue0: Maybe<CurrencyAmount<Currency>>
  fiatFeeValue1: Maybe<CurrencyAmount<Currency>>
}

interface LpIncentivesEarningsResult {
  /** One entry per reward denomination, highest USD value first. Empty when the position has none. */
  rewardBalances: PositionRewardBalance[]
  /** Sum of the priced reward balances. Rewards with no USD value contribute nothing. */
  rewardsUsdValue: number
  /**
   * Fees plus rewards, in USD. Undefined only when neither could be valued — the surfaces read that
   * as "USD value unavailable" rather than as zero earnings.
   */
  totalEarningsUsd?: number
  totalFormattedEarnings?: string
  totalFeesFiatValue?: CurrencyAmount<Currency>
  formattedFeesValue?: string
  formattedRewardsValue?: string
  hasRewards: boolean
  hasFees: boolean
}

/**
 * Fee and reward earnings for a position, formatted for display.
 *
 * Rewards come from the position's `rewardBalances`, one entry per denomination carrying the USD
 * value the backend priced.
 */
export function useLpIncentivesFormattedEarnings({
  liquidityPosition,
  fiatFeeValue0,
  fiatFeeValue1,
}: UseLpIncentivesFormattedEarningsProps): LpIncentivesEarningsResult {
  const { convertFiatAmountFormatted } = useLocalizationContext()

  return useMemo(() => {
    const formatCurrency = (value: CurrencyAmount<Currency>) => {
      return convertFiatAmountFormatted(value.toExact(), NumberType.FiatStandard)
    }

    const result: LpIncentivesEarningsResult = {
      rewardBalances: [],
      rewardsUsdValue: 0,
      totalFeesFiatValue: undefined,
      formattedFeesValue: undefined,
      formattedRewardsValue: undefined,
      hasRewards: false,
      hasFees: false,
      totalEarningsUsd: undefined,
      totalFormattedEarnings: undefined,
    }

    if (fiatFeeValue0 && fiatFeeValue1) {
      result.totalFeesFiatValue = fiatFeeValue0.add(fiatFeeValue1)
      result.formattedFeesValue = formatCurrency(result.totalFeesFiatValue)
      result.hasFees = result.totalFeesFiatValue.greaterThan(0)
    } else if (fiatFeeValue0) {
      result.totalFeesFiatValue = fiatFeeValue0
      result.formattedFeesValue = formatCurrency(result.totalFeesFiatValue)
      result.hasFees = result.totalFeesFiatValue.greaterThan(0)
    } else if (fiatFeeValue1) {
      result.totalFeesFiatValue = fiatFeeValue1
      result.formattedFeesValue = formatCurrency(result.totalFeesFiatValue)
      result.hasFees = result.totalFeesFiatValue.greaterThan(0)
    }

    const feesUsd = result.totalFeesFiatValue ? Number(result.totalFeesFiatValue.toExact()) : undefined
    result.totalEarningsUsd = feesUsd
    result.totalFormattedEarnings = result.formattedFeesValue

    // Merkl only reports unclaimed amounts for v4, so v3 positions carry a boosted APR but no
    // balances — nothing to render even though the field exists on both.
    if (liquidityPosition.version !== ProtocolVersion.V4) {
      return result
    }

    const rewardBalances = selectPositionRewardBalances(liquidityPosition.rewardBalances)

    if (rewardBalances.length === 0) {
      return result
    }

    result.rewardBalances = rewardBalances
    result.hasRewards = true
    // Unpriced rewards add nothing to the total, so an entirely unpriced set leaves the earnings
    // total reading as fees alone rather than inventing a value for the reward rows.
    result.rewardsUsdValue = rewardBalances.reduce((sum, balance) => sum + (balance.unclaimedAmountUsd ?? 0), 0)

    if (result.rewardsUsdValue > 0) {
      result.formattedRewardsValue = convertFiatAmountFormatted(result.rewardsUsdValue, NumberType.FiatStandard)
      result.totalEarningsUsd = (feesUsd ?? 0) + result.rewardsUsdValue
      result.totalFormattedEarnings = convertFiatAmountFormatted(result.totalEarningsUsd, NumberType.FiatStandard)
    }

    return result
  }, [fiatFeeValue0, fiatFeeValue1, liquidityPosition, convertFiatAmountFormatted])
}
