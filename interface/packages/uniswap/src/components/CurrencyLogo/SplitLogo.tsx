import { UniverseChainId } from '@universe/chains'
import { Flex, zIndexes } from '@universe/mycelium'
import { Shuffle } from '@universe/mycelium/icons/Shuffle'
import { memo, ReactNode } from 'react'
import { STATUS_RATIO } from 'uniswap/src/components/CurrencyLogo/constants'
import { CurrencyLogo } from 'uniswap/src/components/CurrencyLogo/CurrencyLogo'
import { TransactionSummaryNetworkLogo } from 'uniswap/src/components/CurrencyLogo/NetworkLogo'
import { TokenLogo } from 'uniswap/src/components/CurrencyLogo/TokenLogo'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { TransactionStatus } from 'uniswap/src/features/transactions/types/transactionDetails'

interface Props {
  inputCurrencyInfo: Maybe<CurrencyInfo>
  outputCurrencyInfo: Maybe<CurrencyInfo>
  inputLogoUrl?: string
  outputLogoUrl?: string
  inputFallbackSymbol?: string
  outputFallbackSymbol?: string
  size: number
  chainId: UniverseChainId | null
  customIcon?: ReactNode
  /**
   * 'split' (default): each icon shows its outer half, joined into one circle.
   * 'stacked': two full circular logos side by side, the front (input) logo overlapping the second (output).
   */
  orientation?: 'split' | 'stacked'
}

// px the second logo slides left so the front full logo overlaps it in stacked mode.
// Scales with the logo size so the overlap stays proportional (avoids a cramped look at small
// sizes); equals 12 at size=36 (the mWeb thumbnail), preserving the established look there.
export function getStackedLogoOverlap(size: number): number {
  return Math.round(size / 3)
}

// Total footprint width of the stacked pair: two full logos minus the overlap. Consumers that need
// to reserve the same space (e.g. loading skeletons) should size themselves with this.
export function getStackedLogoWidth(size: number): number {
  return size * 2 - getStackedLogoOverlap(size)
}

/*
 * Pair logo with two layouts:
 * - 'split': one circle where the left 50% comes from the input icon and the right 50% from the output icon.
 * - 'stacked': two full circular logos side by side, the front (input) logo overlapping the output logo.
 * Both layouts show the network/custom badge bottom-right. To suppress the badge, omit the chainId
 * (pass `chainId={null}`) and pass no `customIcon`.
 */
export function SplitLogo({
  size,
  inputCurrencyInfo,
  outputCurrencyInfo,
  inputLogoUrl,
  outputLogoUrl,
  inputFallbackSymbol,
  outputFallbackSymbol,
  chainId,
  customIcon,
  orientation = 'split',
}: Props): JSX.Element {
  const iconSize = size / 2
  const networkLogo = chainId ? (
    <TransactionSummaryNetworkLogo chainId={chainId} size={size * STATUS_RATIO} />
  ) : undefined

  const badge = (customIcon || networkLogo) && (
    <Flex bottom={-4} position="absolute" right={-4} zIndex={zIndexes.mask}>
      {customIcon ?? networkLogo}
    </Flex>
  )

  if (orientation === 'stacked') {
    // Two full logos side by side: the front (input) logo sits on the left, on top, and overlaps
    // the second (output) logo tucked behind it to the right. The network badge renders bottom-right
    // like in split mode (suppressed when chainId is omitted and there's no customIcon).
    const overlap = getStackedLogoOverlap(size)
    return (
      <Flex row height={size} width={size * 2 - overlap} position="relative">
        {/* 2px surface1 ring reads as a clean cutout over the second logo behind it. The negative
            margin keeps the ring purely visual so the logo footprint and overlap stay unchanged. */}
        <Flex
          testID="input-currency-logo-container"
          zIndex={zIndexes.mask}
          m={-2}
          borderWidth="$spacing2"
          borderColor="$surface1"
          borderRadius="$roundedFull"
        >
          {inputLogoUrl || inputFallbackSymbol ? (
            <TokenLogo
              hideNetworkLogo
              url={inputLogoUrl}
              chainId={chainId ?? undefined}
              size={size}
              symbol={inputFallbackSymbol}
            />
          ) : (
            <CurrencyLogo hideNetworkLogo currencyInfo={inputCurrencyInfo} size={size} />
          )}
        </Flex>
        <Flex testID="output-currency-logo-container" ml={-overlap} zIndex={zIndexes.default}>
          {outputLogoUrl || outputFallbackSymbol ? (
            <TokenLogo
              hideNetworkLogo
              url={outputLogoUrl}
              chainId={chainId ?? undefined}
              size={size}
              symbol={outputFallbackSymbol}
            />
          ) : (
            <CurrencyLogo hideNetworkLogo currencyInfo={outputCurrencyInfo} size={size} />
          )}
        </Flex>
        {badge}
      </Flex>
    )
  }

  return (
    <Flex height={size} width={size}>
      <Flex
        left={0}
        overflow="hidden"
        position="absolute"
        testID="input-currency-logo-container"
        top={0}
        width={iconSize - 1 /* -1 to allow for space between the icons */}
      >
        {inputLogoUrl || inputFallbackSymbol ? (
          <TokenLogo
            hideNetworkLogo
            url={inputLogoUrl}
            chainId={chainId ?? undefined}
            size={size}
            symbol={inputFallbackSymbol}
          />
        ) : (
          <CurrencyLogo hideNetworkLogo currencyInfo={inputCurrencyInfo} size={size} />
        )}
      </Flex>
      <Flex
        flexDirection="row-reverse"
        overflow="hidden"
        position="absolute"
        right={0}
        testID="output-currency-logo-container"
        top={0}
        width={iconSize - 1 /* -1 to allow for space between the icons */}
      >
        {outputLogoUrl || outputFallbackSymbol ? (
          <TokenLogo
            hideNetworkLogo
            url={outputLogoUrl}
            chainId={chainId ?? undefined}
            size={size}
            symbol={outputFallbackSymbol}
          />
        ) : (
          <CurrencyLogo hideNetworkLogo currencyInfo={outputCurrencyInfo} size={size} />
        )}
      </Flex>
      {badge}
    </Flex>
  )
}

/**
 * Icon for cross-chain transactions. Icon is grey until TX is successful.
 */
export const CrossChainIcon = memo(function CrossChainIcon({ status }: { status: TransactionStatus }): JSX.Element {
  const backgroundColor = status === TransactionStatus.Success ? '$statusSuccess' : '$neutral2'

  return (
    //  Since the backgroundColor might be opaque, this outer div ensures the background color is solid.
    <Flex
      testID="cross-chain-icon"
      borderColor="$surface1"
      borderWidth="$spacing2"
      borderRadius="$roundedFull"
      overflow="hidden"
      backgroundColor="$background"
    >
      <Flex
        borderRadius="$roundedFull"
        overflow="hidden"
        backgroundColor={backgroundColor}
        width="100%"
        height="100%"
        alignItems="center"
        justifyContent="center"
        p="$spacing1"
      >
        <Shuffle size="$icon.12" color="$surface1" />
      </Flex>
    </Flex>
  )
})
