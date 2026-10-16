import type { UniverseChainId } from '@universe/chains'
import { Flex, Text } from '@universe/mycelium'
import { Code } from '@universe/mycelium/icons/Code'
import type { ReactNode } from 'react'
import { CopyHelper } from 'uniswap/src/components/CopyHelper/CopyHelper'
import { getChainLabel } from 'uniswap/src/features/chains/utils'
import { shortenAddress } from 'utilities/src/addresses'

interface HookCardProps {
  address: string
  name?: string
  chain?: string
  chainId?: UniverseChainId
  icon?: ReactNode
  // Full-bleed 36x36 art that replaces the default surface-boxed icon (e.g. a branded hook logo).
  logo?: ReactNode
  copyableAddress?: boolean
  addressEndAdornment?: ReactNode
}

export function HookCard({
  address,
  name,
  chain,
  chainId,
  icon,
  logo,
  copyableAddress,
  addressEndAdornment,
}: HookCardProps) {
  // Registry entries carry a lowercase chain slug (e.g. "ethereum") — prefer the canonical display label
  const networkLabel = chainId ? getChainLabel(chainId) : chain
  return (
    <Flex row alignItems="center" gap="$gap12">
      <Flex width={36} height={36}>
        {logo ?? (
          <Flex
            width={36}
            height={36}
            backgroundColor="$surface3"
            borderRadius="$rounded8"
            alignItems="center"
            justifyContent="center"
          >
            {icon ?? <Code size={20} color="$neutral1" />}
          </Flex>
        )}
      </Flex>
      <Flex flex={1}>
        <Flex row alignItems="center" gap="$gap8">
          <Text variant="body2" color="$neutral1">
            {name || shortenAddress({ address })}
          </Text>
        </Flex>
        <Flex row alignItems="center" gap="$gap4">
          {networkLabel ? (
            <Text variant="body3" color="$neutral2">
              {networkLabel}
            </Text>
          ) : null}
          {name ? (
            <Text variant="body3" color="$neutral3">
              {shortenAddress({ address })}
            </Text>
          ) : null}
          {copyableAddress ? (
            <Flex display="none" $group-item-hover={{ display: 'flex' }} onPress={(e) => e.stopPropagation()}>
              <CopyHelper toCopy={address} iconSize={14} iconColor="$neutral3" />
            </Flex>
          ) : null}
          {addressEndAdornment}
        </Flex>
      </Flex>
    </Flex>
  )
}
