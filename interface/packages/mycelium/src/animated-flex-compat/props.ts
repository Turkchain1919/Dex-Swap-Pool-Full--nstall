// Type-only — react-native runtime imports are banned outside .native legs.
import type { StyleProp, ViewStyle } from 'react-native'
import type { ReanimatedPassthroughProps } from '../compat/reanimated-props'
import type { FlexCompatProps } from '../flex-compat/props'

// The compat Flex surface plus the Reanimated channels legacy AnimatedFlexProps carried.
// Web accepts and ignores the Reanimated props, like legacy.
export type AnimatedFlexCompatProps = Omit<FlexCompatProps, 'style'> &
  ReanimatedPassthroughProps & {
    /**
     * Regular styles or a `useAnimatedStyle` worklet result. Reanimated's
     * animated-style types don't compose with the compat style type (the legacy
     * surface typed this `any`); `object` admits every animated style while
     * still rejecting scalars.
     */
    style?: StyleProp<ViewStyle> | object
  }
