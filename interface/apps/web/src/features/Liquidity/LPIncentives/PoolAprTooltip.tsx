import { Flex, Text } from '@universe/mycelium'
import { Magic } from '@universe/mycelium/icons/Magic'
import { useTranslation } from 'react-i18next'
import { CurrencyLogo } from 'uniswap/src/components/CurrencyLogo/CurrencyLogo'
import { SplitLogo } from 'uniswap/src/components/CurrencyLogo/SplitLogo'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import type { PositionRewardApr } from 'uniswap/src/features/positions/types'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { rewardCurrencyId, rewardSymbol } from '~/features/Liquidity/LPIncentives/utils'

type PoolAprTooltipProps = {
  currency0Info: Maybe<CurrencyInfo>
  currency1Info: Maybe<CurrencyInfo>
  poolApr?: number
  apr1d?: number
  apr7d?: number
  apr30d?: number
  // One entry per reward token boosting this pool. Surfaces that carry a single bare reward number
  // adapt it into a 1-element array via `toRewardAprEntries`, so this component speaks one
  // reward shape.
  rewards?: PositionRewardApr[]
  // Backend-summed fee + reward APR (`Position.total_apr` / `PoolPosition.totalApr` /
  // `PoolRankStats.total_apr`). Served, never recomposed from the rows below: the backend sums the
  // 24h fee APR (`apr1d`) with every reward boost, so it already equals the visible 24H row plus the
  // reward rows. Unserved renders the formatter's placeholder rather than a client-side sum, so the
  // total can't silently disagree with the APR every other surface shows.
  totalApr?: number
}

/**
 * Breaks a pool's APR down into its parts: an optional windowed fee-APR breakdown (24H/7D/30D),
 * one row per reward token, and the all-in total. Serves every APR surface — plain fee-APR cells,
 * the Explore pools table, and boosted positions — from a single reward model.
 */
export function PoolAprTooltip({
  currency0Info,
  currency1Info,
  poolApr,
  apr1d,
  apr7d,
  apr30d,
  rewards,
  totalApr,
}: PoolAprTooltipProps): JSX.Element {
  const { t } = useTranslation()
  const { formatPercent } = useLocalizationContext()

  const has24hRow = apr1d !== undefined
  const hasRewards = !!rewards?.length
  // The 24H average row supersedes the Pool APR row (design: Philippe Cao), so the latter only renders
  // on surfaces without a 24h fee APR (e.g. the Explore pools table). Keyed on the 24h window alone,
  // not on day-data generally: with only 7D/30D served, neither row would show the fee half of the
  // total. Gated on a defined poolApr too, so a boosted position with no published APRs shows no
  // empty "-" fee row.
  const showPoolAprRow = !has24hRow && poolApr !== undefined

  return (
    <Flex flexDirection="column" gap="$spacing4" id="boosted-apr-tooltip" py="$spacing4" px="$spacing4" maxWidth={256}>
      {showPoolAprRow && (
        <TooltipRow>
          <TooltipLabel
            icon={
              <SplitLogo
                inputCurrencyInfo={currency0Info}
                outputCurrencyInfo={currency1Info}
                size={12}
                chainId={currency0Info?.currency.chainId ?? null}
              />
            }
            label={t('pool.aprText')}
          />
          <Text variant="body4" color="$neutral1" flexShrink={0}>
            {formatPercent(poolApr)}
          </Text>
        </TooltipRow>
      )}
      {apr1d !== undefined && <TimeframeAprRow label={t('pool.apr.average.24h')} apr={apr1d} />}
      {apr7d !== undefined && <TimeframeAprRow label={t('pool.apr.average.7d')} apr={apr7d} />}
      {apr30d !== undefined && <TimeframeAprRow label={t('pool.apr.average.30d')} apr={apr30d} />}
      {/* Keyed by token, not position: the served rewards are one entry per reward token (the proto
          says so on the field), and each row holds a token-list lookup whose result a positional key
          would hand to a different token whenever the response comes back in another order. */}
      {rewards?.map((reward) => (
        <RewardAprRow key={rewardCurrencyId(reward.token)} reward={reward} />
      ))}
      {hasRewards && (
        <TooltipRow
          backgroundColor="$accent2"
          borderBottomLeftRadius="$rounded6"
          borderBottomRightRadius="$rounded6"
          alignItems="center"
        >
          <TooltipLabel
            icon={<Magic size="$icon.12" color="$accent1" />}
            // The served total is the 24h fee APR plus the reward boosts, so name it 24H only when the
            // 24H row is there to back it; every other surface keeps the generic label its fee row uses.
            label={has24hRow ? t('pool.totalAPR.24h') : t('pool.totalAPR')}
            color="$accent1"
            alignItems="center"
          />
          <Text variant="body4" color="$accent1" flexShrink={0}>
            {formatPercent(totalApr)}
          </Text>
        </TooltipRow>
      )}
    </Flex>
  )
}

function RewardAprRow({ reward }: { reward: PositionRewardApr }): JSX.Element {
  const { t } = useTranslation()
  const { formatPercent } = useLocalizationContext()
  const currencyInfo = useCurrencyInfo(rewardCurrencyId(reward.token))
  const symbol = rewardSymbol(currencyInfo, reward.token)

  return (
    <TooltipRow>
      <TooltipLabel
        icon={<CurrencyLogo currencyInfo={currencyInfo} size={12} hideNetworkLogo />}
        label={symbol ? `${symbol} ${t('pool.apr.reward')}` : t('pool.apr.reward')}
      />
      <Text variant="body4" color="$neutral1" flexShrink={0}>
        {formatPercent(reward.boostedPoolApr)}
      </Text>
    </TooltipRow>
  )
}

const TimeframeAprRow = ({ label, apr }: { label: string; apr: number }) => {
  const { formatPercent } = useLocalizationContext()

  return (
    <TooltipRow>
      <TooltipLabel label={label} />
      <Text variant="body4" color="$neutral1" flexShrink={0}>
        {formatPercent(apr)}
      </Text>
    </TooltipRow>
  )
}

type TooltipRowProps = {
  children: React.ReactNode
  backgroundColor?: string
  borderBottomLeftRadius?: string
  borderBottomRightRadius?: string
  alignItems?: 'flex-start' | 'center'
}

// Rows center their content so the minHeight slack splits evenly — combined with the
// container's symmetric vertical padding this keeps the top/bottom margins equal
// whichever row type ends the tooltip.
export const TooltipRow = ({
  children,
  backgroundColor,
  borderBottomLeftRadius,
  borderBottomRightRadius,
  alignItems = 'center',
}: TooltipRowProps) => (
  <Flex
    row
    justifyContent="space-between"
    alignItems={alignItems}
    px="$spacing8"
    minHeight="$spacing24"
    gap="$spacing8"
    backgroundColor={backgroundColor}
    borderBottomLeftRadius={borderBottomLeftRadius}
    borderBottomRightRadius={borderBottomRightRadius}
  >
    {children}
  </Flex>
)

type TooltipLabelProps = {
  label: string
  icon?: React.ReactNode
  color?: string
  alignItems?: 'flex-start' | 'center'
}

export const TooltipLabel = ({ icon, label, color = '$neutral2', alignItems = 'flex-start' }: TooltipLabelProps) => (
  <Flex row alignItems={alignItems} gap="$spacing6" flex={1} maxWidth="80%">
    <Flex pt="$spacing2" flexShrink={0}>
      {icon}
    </Flex>
    <Text variant="body4" color={color} flex={1} numberOfLines={0}>
      {label}
    </Text>
  </Flex>
)
