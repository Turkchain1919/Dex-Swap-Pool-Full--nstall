/**
 * Platform-split base leg; restates the web leg's type for platformless consumers.
 * Prefer `entering`/`exiting` worklets — Reanimated 4 strict mode rejects `useAnimatedStyle` results on non-animated components.
 */
import { PlatformSplitStubError } from '@universe/environment'
import * as React from 'react'
// Type-only — react-native runtime imports are banned outside .native legs.
import type { View } from 'react-native'
import type { CompatRefProp } from '../compat/web-element'
import type { AnimatedFlexCompatProps } from './props'

export const AnimatedFlexCompat: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<AnimatedFlexCompatProps> & { ref?: CompatRefProp | undefined }
> = React.forwardRef<HTMLElement | View, AnimatedFlexCompatProps>(function AnimatedFlexCompat(): React.JSX.Element {
  throw new PlatformSplitStubError('AnimatedFlexCompat')
})

AnimatedFlexCompat.displayName = 'AnimatedFlexCompat'
