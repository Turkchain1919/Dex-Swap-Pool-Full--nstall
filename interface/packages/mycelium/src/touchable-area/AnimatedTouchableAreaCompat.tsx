/**
 * Platform-split base stub — bundlers resolve `AnimatedTouchableAreaCompat.web`
 * / `AnimatedTouchableAreaCompat.native`; this leg is what platformless
 * consumers typecheck against, so it restates the web leg's value type.
 */
import { PlatformSplitStubError } from '@universe/environment'
import * as React from 'react'
// Type-only — react-native runtime imports are banned outside .native legs.
import type { View } from 'react-native'
// The multi-arm ref prop shape shared with the Flex compat (see
// FlexCompat.tsx for why it is a union of ref types, not a ref of a union).
import type { CompatRefProp } from '../compat/web-element'
import type { AnimatedTouchableAreaCompatProps } from './animated-props'

export const AnimatedTouchableAreaCompat: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<AnimatedTouchableAreaCompatProps> & { ref?: CompatRefProp | undefined }
> = React.forwardRef<HTMLElement | View, AnimatedTouchableAreaCompatProps>(
  function AnimatedTouchableAreaCompat(): React.JSX.Element {
    throw new PlatformSplitStubError('AnimatedTouchableAreaCompat')
  },
)

AnimatedTouchableAreaCompat.displayName = 'AnimatedTouchableAreaCompat'
