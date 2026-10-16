import { isWebPlatform } from '@universe/environment'
import type { FontVariantToken } from '@universe/mycelium'
import AnimatedNumber from 'uniswap/src/components/AnimatedNumber/AnimatedNumber'
import { AnimatedNumberDirection } from 'uniswap/src/components/AnimatedNumber/types'
import { useLiveEarnRewardsUsd } from 'uniswap/src/features/earn/hooks/useLiveEarnRewardsUsd'
import { getDisplayLifetimeEarningsUsd } from 'uniswap/src/features/earn/utils'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { NumberType } from 'utilities/src/format/types'

/**
 * Lifetime-earnings value: an odometer while actively accruing, `fallback` otherwise.
 * Mount as a leaf — the 1 Hz tick re-renders only this component.
 */
export function LiveEarnRewardsAmount({
  lifetimeEarningsUsd,
  annualRewardsRateUsd,
  // Web-only for now: native can't afford the animated digit slots (see AnimatedNumberProps).
  enabled = isWebPlatform,
  textVariant,
  containerTestID,
  fallback,
}: {
  lifetimeEarningsUsd: number | undefined
  annualRewardsRateUsd: number
  enabled?: boolean
  textVariant: FontVariantToken
  containerTestID?: string
  fallback: JSX.Element | null
}): JSX.Element | null {
  const { convertFiatAmountFormatted } = useLocalizationContext()
  // Anchor on the signed value so a negative PnL ticks toward zero; abs only at format time.
  const liveRewards = useLiveEarnRewardsUsd({
    baseRewardsUsd: lifetimeEarningsUsd,
    annualRewardsRateUsd,
    enabled,
  })
  const displayValueUsd = getDisplayLifetimeEarningsUsd(liveRewards.valueUsd)

  if (!liveRewards.isLive || liveRewards.valueUsd === undefined || displayValueUsd === undefined) {
    return fallback
  }

  // A negative PnL ticks toward zero, so its abs'd display shrinks — roll the digits down to match.
  const direction = liveRewards.valueUsd < 0 ? AnimatedNumberDirection.DOWN : AnimatedNumberDirection.UP

  return (
    <AnimatedNumber
      shouldFadeDecimals
      alignRight
      value={convertFiatAmountFormatted(displayValueUsd, NumberType.FiatRewardsPrecise)}
      numericValue={displayValueUsd}
      textVariant={textVariant}
      color="$statusSuccess"
      forceDirection={direction}
      containerTestID={containerTestID}
    />
  )
}
