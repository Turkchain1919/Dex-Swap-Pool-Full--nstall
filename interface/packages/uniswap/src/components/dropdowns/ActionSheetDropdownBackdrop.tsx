import { cn, Flex, type FlexCompatProps as FlexProps } from '@universe/mycelium'
import { useIsDarkMode } from '@universe/mycelium/theme-hooks-compat'
import { forwardRef, type CSSProperties, type JSX } from 'react'
import type { View } from 'react-native'
import { BACKDROP_PRESENCE_STYLE, PRESENCE_CLASSES } from 'uniswap/src/components/dropdowns/actionSheetDropdownPresence'

export type BackdropProps = {
  opacity?: number
  handleClose?: FlexProps['onPress']
  className?: string
  style?: CSSProperties
  /**
   * Both read by `Presence` off `element.props`, never used in here.
   *
   * `animatePresence={false}` drops the exit hold on native, where `Presence` cannot re-resolve
   * exit presentation — without it this full-screen node keeps swallowing taps for the whole fade.
   * The dropdown content takes the same opt-out for the same reason.
   *
   * `position` tells Presence's native leg to give this child an out-of-flow wrapper. Without it
   * the wrapper sits in flow, Yoga gives it main-axis size 0, and an `inset: 0` child collapses
   * with it — the backdrop then renders but receives no touches, so pressing outside the dropdown
   * does not dismiss it.
   */
  animatePresence?: boolean
  position?: 'absolute'
}

/**
 * `Presence` sets `data-exiting` on the node it holds and merges exit `className`/`style` into the
 * clone, so the animated node must be this component's root.
 */
export const Backdrop = forwardRef<View, BackdropProps>(function Backdrop(
  { handleClose, opacity: opacityProp, className, style },
  ref,
): JSX.Element {
  const isDarkMode = useIsDarkMode()

  const opacity = opacityProp ?? (isDarkMode ? 0.4 : 0.2)

  return (
    <Flex
      ref={ref}
      className={cn('pointer-events-auto', PRESENCE_CLASSES, className)}
      style={{ ...BACKDROP_PRESENCE_STYLE, ...style }}
      backgroundColor="$black"
      flex={1}
      inset={0}
      opacity={opacity}
      position="absolute"
      testID="dropdown-backdrop"
      onPress={handleClose}
    />
  )
})
