/**
 * NATIVE leg of `ButtonTextCompat`, transcribed from
 * `../button-compat/ButtonCompat.native.tsx`'s `ButtonText`: uniwind resolves
 * the native text cell (state selected by the frame context's live
 * `hovered`/`pressed` booleans — uniwind drops `group-hover:` in silence),
 * and the buttonFont family/weight ride `style` (apps/mobile imports no
 * mycelium font CSS). Open Text style props ride the RN style lane.
 */
import { forwardRef, type JSX } from 'react'
import { Platform, Text } from 'react-native'
import { buttonCompatNativeTextClassName } from '../button-compat/compile'
import { warnUnsupportedNativeProps } from '../compat/native-diagnostics'
import { compatNativeStyle } from '../compat/native-style'
import type { TextCompatStyleProps } from '../text-compat/props'
import { ButtonFrameContextProvider, useButtonFrameContext } from './context'
import { getMaybeHexOrRgbColor } from './custom-color'
import type { ButtonTextCompatProps } from './text-props-native'

export type { ButtonTextCompatProps } from './text-props-native'

const FONT_FAMILY_BUTTON = Platform.select({ android: 'Basel-Grotesk-Medium', default: 'Basel Grotesk' })
const FONT_WEIGHT_BUTTON = '500'
const MAX_FONT_SIZE_MULTIPLIER = 1.2

export const ButtonTextCompat = forwardRef<Text, ButtonTextCompatProps>(
  function ButtonTextCompat(props, ref): JSX.Element {
    const ctx = useButtonFrameContext()
    const {
      variant = ctx.variant,
      emphasis = ctx.emphasis,
      size = ctx.size,
      isDisabled = ctx.isDisabled,
      'custom-background-color': customBackgroundColorProp,
      'line-height-disabled': lineHeightDisabledLegacy,
      lineHeightDisabled: lineHeightDisabledProp,
      color,
      children,
      style,
      testID,
      className,
      ...open
    } = props

    const lineHeightDisabled = lineHeightDisabledProp ?? lineHeightDisabledLegacy === 'true'
    const customColor = getMaybeHexOrRgbColor(color)
    const tokenColor = customColor === undefined ? color : undefined
    // Same gate as the web leg: contrast-against-custom-background beats a
    // concrete label color, so the two legs paint identically.
    const customBackground = getMaybeHexOrRgbColor(customBackgroundColorProp) ?? ctx.customBackgroundColor

    const closedClassName = buttonCompatNativeTextClassName({
      variant,
      emphasis,
      size,
      isDisabled,
      customTextClass: isDisabled ? undefined : ctx.customTextClass,
      hovered: ctx.hovered ?? false,
      pressed: ctx.pressed ?? false,
      lineHeightDisabled,
      className,
    })

    const { style: openStyle, dropped } = compatNativeStyle({ ...open, color: tokenColor } as TextCompatStyleProps)
    warnUnsupportedNativeProps('ButtonTextCompat', dropped)

    return (
      // Re-broadcast the resolved selection like the web leg, so a nested
      // ThemedIcon inside Button.Text reads the label's overrides, not the
      // frame's cell.
      <ButtonFrameContextProvider value={{ ...ctx, variant, emphasis, size, isDisabled }}>
        <Text
          ref={ref}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          numberOfLines={1}
          style={[
            { fontFamily: FONT_FAMILY_BUTTON, fontWeight: FONT_WEIGHT_BUTTON },
            openStyle,
            customColor !== undefined && !isDisabled && !customBackground ? { color: customColor } : undefined,
            style,
          ]}
          testID={testID}
          {...{ className: closedClassName }}
        >
          {children}
        </Text>
      </ButtonFrameContextProvider>
    )
  },
)
