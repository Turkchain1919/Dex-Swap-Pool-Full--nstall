/**
 * Native leg of the SpinningLoader compat (INFRA-3644) — the `ui/src`
 * SpinningLoader rebuild's native leg, re-homed: a reanimated rotation around
 * the circle-spinner glyph. mycelium's icon components emit a DOM `<svg>` and
 * have no native leg by design, so the glyphs are drawn with
 * `react-native-svg` from the shared geometry — the
 * `ModalCloseIconCompat.native.tsx` mechanism.
 */
import { type JSX, useEffect } from 'react'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { Circle, Path, Svg } from 'react-native-svg'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import { useSporeColors } from '../theme-hooks-compat/useSporeColors'
import { CIRCLE_SPINNER_GLYPH, EMPTY_SPINNER_GLYPH, resolveSpinnerColor, type SpinningLoaderCompatProps } from './props'

export type { SpinningLoaderCompatProps } from './props'

/** The legacy CircleSpinner glyph at an explicit resolved color. */
function CircleSpinnerGlyph({ color, size }: { color: string | undefined; size: number }): JSX.Element {
  return (
    <Svg fill="none" height={size} viewBox={CIRCLE_SPINNER_GLYPH.viewBox} width={size}>
      <Path
        d={CIRCLE_SPINNER_GLYPH.trackPath}
        opacity={CIRCLE_SPINNER_GLYPH.trackOpacity}
        stroke={color}
        strokeLinecap="round"
        strokeWidth={CIRCLE_SPINNER_GLYPH.strokeWidth}
      />
      <Path
        d={CIRCLE_SPINNER_GLYPH.arcPath}
        stroke={color}
        strokeLinecap="round"
        strokeWidth={CIRCLE_SPINNER_GLYPH.strokeWidth}
      />
    </Svg>
  )
}

/** The legacy EmptySpinner glyph at an explicit resolved color. */
function EmptySpinnerGlyph({ color, size }: { color: string | undefined; size: number }): JSX.Element {
  return (
    <Svg fill="none" height={size} viewBox={EMPTY_SPINNER_GLYPH.viewBox} width={size}>
      <Circle
        cx={EMPTY_SPINNER_GLYPH.circle.cx}
        cy={EMPTY_SPINNER_GLYPH.circle.cy}
        r={EMPTY_SPINNER_GLYPH.circle.r}
        stroke={color}
        strokeOpacity={EMPTY_SPINNER_GLYPH.strokeOpacity}
        strokeWidth={EMPTY_SPINNER_GLYPH.strokeWidth}
      />
    </Svg>
  )
}

export function SpinningLoaderCompat({ size = 20, disabled, color }: SpinningLoaderCompatProps): JSX.Element {
  const colors = useSporeColors()
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
        // easeInOutQuint, matching the web leg's cubic-bezier(0.83, 0, 0.17, 1) exactly —
        // the same hand-written bezier the legacy leg pinned (no Spore preset carries it).
        easing: Easing.bezier(0.83, 0, 0.17, 1),
      }),
      -1,
    )
    return () => cancelAnimation(rotation)
    // oxlint-disable-next-line react/exhaustive-deps -- transcribed from the legacy leg: the loop arms once on mount
  }, [])

  if (disabled) {
    return <EmptySpinnerGlyph color={resolveSpinnerColor(colors, '$neutral3')} size={size} />
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
      <CircleSpinnerGlyph color={resolveSpinnerColor(colors, color ?? '$neutral2')} size={size} />
    </Animated.View>
  )
}

SpinningLoaderCompat.displayName = 'SpinningLoaderCompat'

// Legacy color-injecting wrappers (TouchableArea compat) must skip this
// primitive — it styles itself; its `color` prop is the sanctioned way to
// tint the spinner.
markMyceliumPrimitive(SpinningLoaderCompat)
