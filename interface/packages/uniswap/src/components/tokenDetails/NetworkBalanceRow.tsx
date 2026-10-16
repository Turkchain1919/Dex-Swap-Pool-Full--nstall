import { UniverseChainId } from '@universe/chains'
import { isMobileApp, isWebPlatform } from '@universe/environment'
import { borderRadii, Flex, Text, TouchableArea } from '@universe/mycelium'
import { TooltipCompat as Tooltip } from '@universe/mycelium/tooltip-compat'
import { memo } from 'react'
import AnimatedNumber from 'uniswap/src/components/AnimatedNumber/AnimatedNumber'
import { NetworkLogo } from 'uniswap/src/components/CurrencyLogo/NetworkLogo'
import { getChainLabel } from 'uniswap/src/features/chains/utils'
import { PortfolioBalance } from 'uniswap/src/features/dataApi/types'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { NumberType } from 'utilities/src/format/types'

const NETWORK_LOGO_SIZE = 24

function DefaultNetworkLogo({ chainId }: { chainId: UniverseChainId }): JSX.Element {
  return <NetworkLogo borderRadius={borderRadii.rounded8} chainId={chainId} size={NETWORK_LOGO_SIZE} />
}

interface NetworkBalanceRowProps {
  balance: PortfolioBalance
  onPress?: () => void
}

export const NetworkBalanceRow = memo(function NetworkBalanceRow({
  balance,
  onPress,
}: NetworkBalanceRowProps): JSX.Element {
  const { convertFiatAmountFormatted, formatNumberOrString } = useLocalizationContext()
  const { chainId } = balance.currencyInfo.currency

  const formattedUsdValue = convertFiatAmountFormatted(balance.balanceUSD, NumberType.PortfolioBalance)
  const formattedBalance = formatNumberOrString({ value: balance.quantity, type: NumberType.TokenNonTx })

  const rowContent = (
    <Flex row my="$spacing8" alignItems="center" gap="$spacing12">
      <DefaultNetworkLogo chainId={chainId} />
      <Flex shrink row flex={1} justifyContent="space-between" alignItems="center">
        <AnimatedNumber
          numericValue={balance.balanceUSD ?? undefined}
          value={formattedUsdValue}
          textVariant="$subheading2"
        />
        <Text variant={isMobileApp ? 'subheading2' : 'body2'} color="$neutral2">
          {formattedBalance}
        </Text>
      </Flex>
    </Flex>
  )

  const chainLabel = getChainLabel(chainId)
  const content = isWebPlatform ? (
    <Tooltip delay={0} restMs={0} placement="left">
      <Tooltip.Trigger asChild>{rowContent}</Tooltip.Trigger>
      <Tooltip.Content animationDirection="left">
        <Tooltip.Arrow />
        <Text variant="body3">{chainLabel}</Text>
      </Tooltip.Content>
    </Tooltip>
  ) : (
    rowContent
  )

  return (
    <TouchableArea disabled={!onPress} opacity={1} onPress={onPress}>
      {content}
    </TouchableArea>
  )
})
