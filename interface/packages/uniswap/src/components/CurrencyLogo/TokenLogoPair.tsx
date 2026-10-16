import type { UniverseChainId } from '@universe/chains'
import { Flex, iconSizes, zIndexes } from '@universe/mycelium'
import { STATUS_RATIO } from 'uniswap/src/components/CurrencyLogo/constants'
import { TransactionSummaryNetworkLogo } from 'uniswap/src/components/CurrencyLogo/NetworkLogo'
import { TokenLogo } from 'uniswap/src/components/CurrencyLogo/TokenLogo'
import { OverlapIconWrapper } from 'uniswap/src/components/network/NetworkIconList/OverlapIconWrapper'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'

const OUTER_RATIO = 28 / 24
const OVERLAP_RATIO = 0.5

interface TokenLogoPairProps {
  currency0Info: Maybe<CurrencyInfo>
  currency1Info: Maybe<CurrencyInfo>
  size?: number
  /** Shows a network badge bottom-right of the pair; omit to render without one. */
  chainId?: UniverseChainId | null
}

function SingleTokenLogo({ info, size }: { info: Maybe<CurrencyInfo>; size: number }): JSX.Element {
  const outerSize = size * OUTER_RATIO
  return (
    <Flex centered width={outerSize} height={outerSize}>
      <TokenLogo hideNetworkLogo url={info?.logoUrl} symbol={info?.currency.symbol} size={size} />
    </Flex>
  )
}

export function TokenLogoPair({
  currency0Info,
  currency1Info,
  size = iconSizes.icon24,
  chainId,
}: TokenLogoPairProps): JSX.Element {
  const outerSize = size * OUTER_RATIO
  const overlapPx = size * OVERLAP_RATIO

  return (
    <Flex row alignItems="center" position="relative">
      <Flex centered overflow="hidden" width={outerSize} height={outerSize} borderRadius="$roundedFull" zIndex={2}>
        <SingleTokenLogo info={currency0Info} size={size} />
      </Flex>
      <Flex
        centered
        ml={-overlapPx}
        overflow="hidden"
        width={outerSize}
        height={outerSize}
        borderRadius="$roundedFull"
        zIndex={1}
      >
        <OverlapIconWrapper outerSize={outerSize} overlapPx={overlapPx} clipBorderRadius={outerSize / 2}>
          <SingleTokenLogo info={currency1Info} size={size} />
        </OverlapIconWrapper>
      </Flex>
      {chainId && (
        <Flex bottom={-2} position="absolute" right={-3} zIndex={zIndexes.mask}>
          <TransactionSummaryNetworkLogo chainId={chainId} size={size * STATUS_RATIO} />
        </Flex>
      )}
    </Flex>
  )
}
