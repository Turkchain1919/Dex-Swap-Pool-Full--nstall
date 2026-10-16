import * as React from 'react'
// Type-only — react-native runtime imports are banned outside .native legs.
import type { View } from 'react-native'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import { omitReanimatedPassthroughProps } from '../compat/reanimated-props'
import type { CompatRefProp } from '../compat/web-element'
import { FlexCompat } from '../flex-compat/FlexCompat'
import type { FlexCompatProps } from '../flex-compat/props'
import type { AnimatedFlexCompatProps } from './props'

/**
 * Web leg: renders the compat Flex and drops the Reanimated-only props — web animations ride CSS, like legacy.
 * A worklet `style` is a plain object of resolved values on web, so it collapses back to the compat style type.
 */
export const AnimatedFlexCompat: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<AnimatedFlexCompatProps> & { ref?: CompatRefProp | undefined }
> = React.forwardRef<HTMLElement | View, AnimatedFlexCompatProps>(function AnimatedFlexCompat(props, ref) {
  return <FlexCompat ref={ref} {...(omitReanimatedPassthroughProps(props) as FlexCompatProps)} />
})

AnimatedFlexCompat.displayName = 'AnimatedFlexCompat'
markMyceliumPrimitive(AnimatedFlexCompat)
