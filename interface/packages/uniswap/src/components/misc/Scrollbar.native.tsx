import { AnimatedFlex, Flex, type FlexProps } from '@universe/mycelium'
import { withSporeCurve } from '@universe/tailwind/animations/reanimated'
import Animated, {
  type EntryExitAnimationFunction,
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'

type ScrollbarProps = FlexProps & {
  visibleHeight: number
  contentHeight: number
  scrollOffset: SharedValue<number>
}

const SCROLLBAR_WIDTH = 6

// Reanimated leg of the legacy 'quicker' enter (opacity/width from 0 to the base style).
const scrollbarEntering: EntryExitAnimationFunction = () => {
  'worklet'
  return {
    initialValues: { opacity: 0, width: 0 },
    animations: {
      opacity: withSporeCurve('quicker', 1),
      width: withSporeCurve('quicker', SCROLLBAR_WIDTH),
    },
  }
}

export function Scrollbar({ visibleHeight, contentHeight, scrollOffset, ...rest }: ScrollbarProps): JSX.Element {
  const scrollbarHeight = useSharedValue(0)

  const animatedThumbStyle = useAnimatedStyle(() => {
    const thumbHeight = (visibleHeight / contentHeight) * scrollbarHeight.value

    return {
      top: interpolate(
        scrollOffset.value,
        [0, contentHeight - visibleHeight],
        [0, scrollbarHeight.value - thumbHeight],
        Extrapolate.CLAMP,
      ),
      height: thumbHeight,
    }
  })

  return (
    <AnimatedFlex entering={scrollbarEntering} width={SCROLLBAR_WIDTH} {...rest}>
      <Flex
        fill
        onLayout={({
          nativeEvent: {
            layout: { height },
          },
        }) => {
          scrollbarHeight.value = height
        }}
      >
        <Animated.View style={animatedThumbStyle}>
          <Flex fill backgroundColor="$neutral3" borderRadius="$rounded12" />
        </Animated.View>
      </Flex>
    </AnimatedFlex>
  )
}
