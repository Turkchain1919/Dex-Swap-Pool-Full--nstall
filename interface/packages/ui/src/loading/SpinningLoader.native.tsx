import { useEffect } from 'react'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { CircleSpinner, EmptySpinner } from 'ui/src/components/icons'
import { SpinningLoaderProps } from 'ui/src/loading/types'

export function SpinningLoader({ size = 20, disabled, color }: SpinningLoaderProps): JSX.Element {
  const rotation = useSharedValue(0)

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotateZ: `${rotation.value}deg`,
        },
      ],
    }
  }, [rotation])

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        // easeInOutQuint, matching the web leg's cubic-bezier(0.83, 0, 0.17, 1) exactly. Not a
        // Spore preset: SPORE_ANIMATION_CURVES carries no curve with this bezier/duration, and
        // `@universe/tailwind/animations/reanimated` can't be imported from packages/ui anyway
        // until the tailwind->ui tsconfig reference cycle is broken.
        easing: Easing.bezier(0.83, 0, 0.17, 1),
      }),
      -1,
    )
    return () => cancelAnimation(rotation)
    // oxlint-disable-next-line react/exhaustive-deps -- biome-parity: oxlint is stricter here
  }, [])

  if (disabled) {
    return <EmptySpinner color="$neutral3" size={size} />
  }

  /*
   * We need to set the height and width to the icon's `size` prop because `CircleSpinner` is a SVG and doesn't perfectly respect the `size` prop if it's a float
   * For example, if `size` is 20, the CircleSpinner will be 20x20
   * But, if `size` is 20.x, the CircleSpinner will still be 20x20 (it always rounds down)
   *
   * Direct Reanimated host: the legacy AnimatedFlex wrapper only contributed Tamagui Flex's
   * `flexDirection: 'column'`, which is already the RN View default.
   */
  return (
    <Animated.View style={[animatedStyles, { height: size, width: size }]}>
      <CircleSpinner color={color ?? '$neutral2'} size={size} />
    </Animated.View>
  )
}
