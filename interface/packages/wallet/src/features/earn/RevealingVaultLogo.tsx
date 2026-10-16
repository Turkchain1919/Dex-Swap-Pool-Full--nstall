import type { PropsWithChildren } from 'react'
import { PlatformSplitStubError } from 'utilities/src/errors'
import type { RevealingVaultLogoProps } from 'wallet/src/features/earn/RevealingVaultLogoProps'

/**
 * One stacked vault logo in the unfunded-earn-card reveal: drops in on the
 * Spore '300ms' curve as the reveal steps the visible count.
 */
export function RevealingVaultLogo(_: PropsWithChildren<RevealingVaultLogoProps>): JSX.Element {
  throw new PlatformSplitStubError('RevealingVaultLogo')
}
