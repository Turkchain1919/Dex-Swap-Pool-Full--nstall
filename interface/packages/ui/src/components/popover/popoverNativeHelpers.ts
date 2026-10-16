import type { ViewStyle } from 'react-native'
import { resolvePopoverStyleProps } from 'ui/src/components/popover/popoverStyleResolution'
import type { UseSporeColorsReturn } from 'ui/src/hooks/useSporeColors'

/**
 * Native-leg style resolution for the rebuilt Popover (INFRA-3318). Platform-neutral
 * module (the react-native import is type-only) shared by Popover.native.tsx and
 * PopoverInternal.native.tsx.
 */
export function resolveNativeStyle(colors: UseSporeColorsReturn, styleProps: Record<string, unknown>): ViewStyle {
  return resolvePopoverStyleProps({ colors, styleProps, platform: 'native' }) as ViewStyle
}
