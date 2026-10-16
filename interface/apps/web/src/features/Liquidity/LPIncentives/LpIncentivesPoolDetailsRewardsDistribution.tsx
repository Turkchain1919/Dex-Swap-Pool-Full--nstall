import { CurrencyAmount } from '@uniswap/sdk-core'
import { Flex, Text } from '@universe/mycelium'
import { TFunction } from 'i18next'
import JSBI from 'jsbi'
import ms from 'ms'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrentLanguage } from 'uniswap/src/features/language/hooks'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { useUSDCPrice } from 'uniswap/src/features/transactions/hooks/useUSDCPrice'
import { NumberType } from 'utilities/src/format/types'
import type { RewardsCampaign } from '~/data/pools/poolData'
import { LpIncentivesInfoTooltip } from '~/features/Liquidity/LPIncentives/LpIncentivesInfoTooltip'

function formatDateRange({
  startTimestamp,
  endTimestamp,
  locale,
}: {
  startTimestamp?: number
  endTimestamp?: number
  locale: ReturnType<typeof useCurrentLanguage>
}): string {
  if (!startTimestamp || !endTimestamp) {
    return ''
  }
  const start = new Date(startTimestamp * 1000)
  const end = new Date(endTimestamp * 1000)
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

  const startDateStr = new Intl.DateTimeFormat(locale, options).format(start)
  const endDateStr = new Intl.DateTimeFormat(locale, options).format(end)
  return `${startDateStr} - ${endDateStr}`
}

const getDaysRemaining = (endTimestamp: number | undefined, t: TFunction): string => {
  if (!endTimestamp) {
    return ''
  }
  const now = Date.now()
  const end = endTimestamp * 1000
  const diff = end - now
  if (diff <= 0) {
    return t('common.ended')
  }
  const days = diff / ms('1d')
  if (days < 1) {
    return `< 1 ${t('common.day')}`
  }
  return `${Math.ceil(days)} ${t('pool.incentives.daysLeft')}`
}

interface BarChartSideProps {
  percent: number
  color: string
  isLeft: boolean
}

const BarChartSide = ({ percent, color, isLeft }: BarChartSideProps) => {
  return (
    <Flex
      height={8}
      width={`${percent * 100}%`}
      backgroundColor={color}
      {...(isLeft
        ? { borderTopLeftRadius: 5, borderBottomLeftRadius: 5, borderRightWidth: 1, borderRightColor: '$surface2' }
        : { borderTopRightRadius: 5, borderBottomRightRadius: 5, borderLeftWidth: 1, borderLeftColor: '$surface2' })}
    />
  )
}

export const LpIncentivesPoolDetailsRewardsDistribution = ({
  rewardsCampaign,
}: {
  rewardsCampaign?: RewardsCampaign
}) => {
  const { formatCurrencyAmount, convertFiatAmountFormatted } = useLocalizationContext()
  // The totals are raw amounts in the campaign's own served token — there is no stand-in for it,
  // since scaling and pricing them at another token's decimals would print a different number.
  const rewardToken = rewardsCampaign?.token
  const { price: rewardTokenPrice } = useUSDCPrice(rewardToken)
  const { t } = useTranslation()
  const currentLanguage = useCurrentLanguage()

  const rewardsPercent = useMemo(() => {
    if (!rewardsCampaign) {
      return 0
    }
    const distributed = rewardsCampaign.distributedRewards
      ? JSBI.BigInt(rewardsCampaign.distributedRewards)
      : JSBI.BigInt(0)
    const total = rewardsCampaign.totalRewardAllocation
      ? JSBI.BigInt(rewardsCampaign.totalRewardAllocation)
      : JSBI.BigInt(0)

    if (JSBI.greaterThan(total, JSBI.BigInt(0))) {
      const distributedNum = parseFloat(distributed.toString())
      const totalNum = parseFloat(total.toString())
      if (totalNum === 0) {
        return 0
      }
      return Math.min(1, distributedNum / totalNum)
    }
    return 0
  }, [rewardsCampaign])

  const timePercent = useMemo(() => {
    if (!rewardsCampaign) {
      return 0
    }
    const start = rewardsCampaign.startTimestamp
    const end = rewardsCampaign.endTimestamp
    if (!start || !end || start >= end) {
      return 0
    }
    const now = Date.now() / 1000
    if (now <= start) {
      return 0
    }
    if (now >= end) {
      return 1
    }
    const duration = end - start
    const elapsed = now - start
    return elapsed / duration
  }, [rewardsCampaign])

  // Without a total there is nothing to distribute against — both amounts read 0 and the bar sits
  // empty. The token is checked alongside it (the parser drops the total whenever it can't name the
  // token, so this is one condition in practice) because the amounts are meaningless without it.
  if (!rewardsCampaign?.totalRewardAllocation || !rewardToken) {
    return null
  }

  const distributedRewardsRaw = rewardsCampaign.distributedRewards
    ? JSBI.BigInt(rewardsCampaign.distributedRewards)
    : JSBI.BigInt(0)
  const totalRewardAllocationRaw = JSBI.BigInt(rewardsCampaign.totalRewardAllocation)

  const distributedRewardsAmount = CurrencyAmount.fromRawAmount(rewardToken, distributedRewardsRaw)
  const totalRewardAllocationAmount = CurrencyAmount.fromRawAmount(rewardToken, totalRewardAllocationRaw)

  const distributedRewardsFiat = rewardTokenPrice?.quote(distributedRewardsAmount)
  const totalRewardAllocationFiat = rewardTokenPrice?.quote(totalRewardAllocationAmount)

  const formattedDistributedToken = formatCurrencyAmount({
    value: distributedRewardsAmount,
    type: NumberType.TokenQuantityStats,
  })
  const formattedTotalToken = formatCurrencyAmount({
    value: totalRewardAllocationAmount,
    type: NumberType.TokenQuantityStats,
  })

  const formattedDistributedFiat = convertFiatAmountFormatted(
    distributedRewardsFiat?.toExact(),
    NumberType.FiatTokenStats,
  )

  const formattedTotalFiat = convertFiatAmountFormatted(totalRewardAllocationFiat?.toExact(), NumberType.FiatTokenStats)

  const daysRemaining = getDaysRemaining(rewardsCampaign.endTimestamp, t)
  const dateRange = formatDateRange({
    startTimestamp: rewardsCampaign.startTimestamp,
    endTimestamp: rewardsCampaign.endTimestamp,
    locale: currentLanguage,
  })

  return (
    <Flex padding="$spacing20" borderRadius="$rounded20" backgroundColor="$surface2" width="100%">
      <Flex flex={1} gap="$gap8" minWidth={180} $md={{ minWidth: 150 }}>
        <Flex row justifyContent="space-between" alignItems="center">
          <Text color="$neutral2" variant="body2">
            {t('pool.incentives.rewardsDistribution')}
          </Text>
          {/* The card only renders off a served campaign, so there is no fetch of its own to fail. */}
          <LpIncentivesInfoTooltip hasError={false} />
        </Flex>
        <Flex row justifyContent="space-between" alignItems="flex-end">
          <Text variant="body3" color="$neutral1">
            {formattedDistributedToken} {rewardToken.symbol} ({formattedDistributedFiat})
          </Text>
          <Text variant="body3" color="$neutral2">
            / {formattedTotalToken} {rewardToken.symbol} ({formattedTotalFiat})
          </Text>
        </Flex>
        <Flex row width="100%">
          <BarChartSide percent={rewardsPercent} color="$accent1" isLeft={true} />
          <BarChartSide percent={1 - rewardsPercent} color="$accent2" isLeft={false} />
        </Flex>
      </Flex>

      <Flex flex={1} gap="$gap8" minWidth={180} $md={{ minWidth: 150 }} mt="$spacing20">
        <Text variant="body2" color="$neutral2">
          {t('pool.incentives.timePeriod')}
        </Text>
        <Flex row justifyContent="space-between" alignItems="flex-end">
          <Text variant="body3" color="$neutral1">
            {daysRemaining}
          </Text>
          <Text variant="body3" color="$neutral2">
            {dateRange}
          </Text>
        </Flex>
        <Flex row width="100%">
          <BarChartSide percent={timePercent} color="$accent1" isLeft={true} />
          <BarChartSide percent={1 - timePercent} color="$accent2" isLeft={false} />
        </Flex>
      </Flex>
    </Flex>
  )
}
