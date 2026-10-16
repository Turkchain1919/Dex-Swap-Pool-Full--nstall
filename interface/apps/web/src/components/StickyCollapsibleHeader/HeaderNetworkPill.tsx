import type { UniverseChainId } from '@universe/chains'
import { Flex, iconSizes, Text } from '@universe/mycelium'
import { NetworkLogo } from 'uniswap/src/components/CurrencyLogo/NetworkLogo'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { HEADER_TRANSITION } from '~/components/StickyCollapsibleHeader/constants'

/**
 * Display-only network pill (logo + name) for a detail-page header on a single-chain surface, where a
 * network *filter* would be a trigger with nothing to switch to. Matches the resting look of the
 * multichain filter on the token detail header.
 */
export function HeaderNetworkPill({ chainId }: { chainId: UniverseChainId }): JSX.Element {
  return (
    <Flex row alignItems="center" gap="$spacing6" alignSelf="center">
      <NetworkLogo chainId={chainId} size={iconSizes.icon16} transition={HEADER_TRANSITION} />
      <Text variant="buttonLabel3" color="$neutral2" transition={HEADER_TRANSITION}>
        {getChainInfo(chainId).label}
      </Text>
    </Flex>
  )
}
