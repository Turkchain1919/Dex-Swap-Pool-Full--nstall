import { iconSizes } from '@universe/mycelium'
import { AccountIcon } from 'uniswap/src/features/accounts/AccountIcon'
import { useOnchainDisplayName } from 'uniswap/src/features/accounts/useOnchainDisplayName'
import { Pill, PillPressProps } from 'uniswap/src/features/search/SearchModal/RecentSearchPills/Pill'

export function WalletPill({
  address,
  label,
  ...pressProps
}: PillPressProps & { address: Address; label?: string }): JSX.Element {
  // History only stores the address; resolve the ENS/Unitag name like the vertical wallet row does.
  const displayName = useOnchainDisplayName(address)
  return (
    <Pill
      label={label ?? displayName?.name ?? ''}
      leading={<AccountIcon address={address} size={iconSizes.icon24} />}
      {...pressProps}
    />
  )
}
