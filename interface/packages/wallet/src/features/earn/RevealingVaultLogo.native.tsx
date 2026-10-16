import { AnimatedFlex } from '@universe/mycelium'
import { withSporeCurve } from '@universe/tailwind/animations/reanimated'
import type { PropsWithChildren } from 'react'
import { useAnimatedStyle } from 'react-native-reanimated'
import {
  LOGO_DROP_START_Y,
  LOGO_STACK_OVERLAP_ML,
  type RevealingVaultLogoProps,
} from 'wallet/src/features/earn/RevealingVaultLogoProps'

/**
 * Native leg: hand-rolled Reanimated (the INFRA-3737 lane) on the same Spore
 * '300ms' curve the legacy preset used.
 */
export function RevealingVaultLogo({
  isFirst,
  visible,
  zIndex,
  children,
}: PropsWithChildren<RevealingVaultLogoProps>): JSX.Element {
  const dropInAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: withSporeCurve('300ms', visible ? 1 : 0),
      transform: [{ translateY: withSporeCurve('300ms', visible ? 0 : LOGO_DROP_START_Y) }],
    }),
    [visible],
  )

  return (
    <AnimatedFlex
      ml={isFirst ? 0 : LOGO_STACK_OVERLAP_ML}
      borderWidth="$spacing2"
      borderColor="$surface1"
      borderRadius="$roundedFull"
      zIndex={zIndex}
      style={dropInAnimatedStyle}
    >
      {children}
    </AnimatedFlex>
  )
}
