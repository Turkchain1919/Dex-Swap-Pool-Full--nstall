import { FlexCompat as Flex, type FlexCompatProps as FlexProps } from '@universe/mycelium/flex-compat'
import { SPORE_ANIMATION_CURVE_CSS } from '@universe/tailwind/animations'
import { memo, useMemo } from 'react'
import { I18nManager } from 'react-native'
import { IconProps } from 'ui/src/components/factories/createIcon'
import { useResolvedIconColor } from 'ui/src/components/factories/iconHooks'
import { IconColorToken } from 'ui/src/components/factories/iconTokens'
import { Chevron } from 'ui/src/components/icons'
import { IconSizeTokens } from 'ui/src/theme/tokens'

type Props = {
  size?: IconSizeTokens
  direction?: 'up' | 'right' | 'down' | 'left' | 'start' | 'end'
  // (string & {}) keeps values cast to Tamagui's wider ColorTokens (e.g. CSS color names) assignable
  color?: IconColorToken | (string & {})
} & Omit<FlexProps, 'direction' | '$group-item-hover' | 'width' | 'height'> &
  Pick<IconProps, '$group-item-hover'>

/**
 * The rotate easing, restored explicitly from the Spore curve library. Legacy preset names reach
 * FlexCompat for API compatibility only: resolving their timing was a Tamagui driver concern the
 * compat has no runtime for, so nothing would animate otherwise. Keyed off the caller's own preset
 * so NetworkFilterTrigger's 100ms and PositionStatusFilter's 200ms stay distinct rather than all
 * collapsing onto `fast`. Scoped to `transform`, never `all`, per the color-flash rule.
 */
function rotateTransitionFor(preset: Props['animation']): string {
  const curve = typeof preset === 'string' ? SPORE_ANIMATION_CURVE_CSS[preset] : SPORE_ANIMATION_CURVE_CSS.fast
  return `transform ${curve}`
}

function RotatableChevronIcon({
  color,
  size = '$icon.24',
  direction = 'start',
  animation = 'fast',
  '$group-item-hover': $groupItemHover,
  ...rest
}: Props): JSX.Element {
  const degree = useMemo(() => {
    switch (direction) {
      case 'start':
        return I18nManager.isRTL ? '180deg' : '0deg'
      case 'end':
        return I18nManager.isRTL ? '0deg' : '180deg'
      case 'up':
        return '90deg'
      case 'right':
        return '180deg'
      case 'down':
        return '270deg'
      case 'left':
      default:
        return '0deg'
    }
  }, [direction])

  const resolvedColor = useResolvedIconColor(color)

  return (
    <Flex
      centered
      borderRadius="$roundedFull"
      rotate={degree}
      // The transition rides the compat prop rather than inline `style` so the native leg drops it
      // with a warning; a CSS transition string inside `style` reaches an RN View, which ignores
      // it silently.
      transition={rotateTransitionFor(animation)}
      {...rest}
    >
      <Chevron $group-item-hover={$groupItemHover} color={resolvedColor as IconProps['color']} size={size} />
    </Flex>
  )
}
export const RotatableChevron = memo(RotatableChevronIcon)
