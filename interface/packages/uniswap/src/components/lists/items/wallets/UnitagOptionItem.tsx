import { sanitizeAddressText } from '@universe/chains'
import { iconSizes, type ModifierPressProps, Text } from '@universe/mycelium'
import { OptionItemProps } from 'uniswap/src/components/lists/items/OptionItem'
import { UnitagOption } from 'uniswap/src/components/lists/items/types'
import { WalletBaseOptionItem } from 'uniswap/src/components/lists/items/wallets/WalletBaseOptionItem'
import { AccountIcon } from 'uniswap/src/features/accounts/AccountIcon'
import { UnitagName } from 'uniswap/src/features/unitags/UnitagName'
import { shortenAddress } from 'utilities/src/addresses'

type UnitagOptionItemProps = ModifierPressProps & {
  unitagOption: UnitagOption
  onPress: OptionItemProps['onPress']
}

export function UnitagOptionItem({
  unitagOption,
  onPress,
  modifierPressHref,
  onModifierPress,
}: UnitagOptionItemProps): JSX.Element {
  const { address, unitag } = unitagOption

  return (
    <WalletBaseOptionItem
      option={unitagOption}
      image={<AccountIcon address={address} size={iconSizes.icon40} />}
      title={
        <UnitagName
          displayUnitagSuffix
          displayIconInline
          name={unitag}
          // UnitagName pins fontFamily="$heading", and a variant's size is a font-relative token
          // resolved against that font — body1's $large would render at the heading scale (52px).
          // Re-keying the font context to $body resolves it to 18px (same `book` family either way).
          textProps={{ variant: 'body1', fontFamily: '$body', lineHeight: undefined }}
        />
      }
      subtitle={
        <Text color="$neutral2" variant="body2">
          {sanitizeAddressText(shortenAddress({ address }))}
        </Text>
      }
      modifierPressHref={modifierPressHref}
      onPress={onPress}
      onModifierPress={onModifierPress}
    />
  )
}
