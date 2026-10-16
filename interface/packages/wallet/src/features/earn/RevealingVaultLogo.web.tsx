import { Flex } from '@universe/mycelium'
import type { PropsWithChildren } from 'react'
import {
  LOGO_DROP_START_Y,
  LOGO_STACK_OVERLAP_ML,
  type RevealingVaultLogoProps,
} from 'wallet/src/features/earn/RevealingVaultLogoProps'

/**
 * Web leg: the '300ms' drop-in rides a scoped transition — opacity/transform
 * only, the border color is a theme token.
 */
export function RevealingVaultLogo({
  isFirst,
  visible,
  zIndex,
  children,
}: PropsWithChildren<RevealingVaultLogoProps>): JSX.Element {
  return (
    <Flex
      ml={isFirst ? 0 : LOGO_STACK_OVERLAP_ML}
      borderWidth="$spacing2"
      borderColor="$surface1"
      borderRadius="$roundedFull"
      zIndex={zIndex}
      opacity={visible ? 1 : 0}
      y={visible ? 0 : LOGO_DROP_START_Y}
      transition="opacity 300ms ease-in-out, transform 300ms ease-in-out"
    >
      {children}
    </Flex>
  )
}
