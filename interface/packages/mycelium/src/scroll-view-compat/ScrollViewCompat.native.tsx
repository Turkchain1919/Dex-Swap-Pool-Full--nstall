/**
 * React Native rendering of ScrollViewCompat: a real RN
 * `ScrollView`, never a DOM host — the scroll behavior, momentum, keyboard
 * handling and indicators are the platform's own, exactly as under the legacy
 * `styled(ScrollViewNative, …)` wrapper. See `FlexCompat.native.tsx` for the
 * className/style split and the `onLayout` contract.
 *
 * The frame className carries NO base classes: the RN host owns its base
 * (direction, overflow, grow/shrink), so only the caller's style pools
 * compile (see `compile.ts`). The RN scroll surface forwards through a
 * curated allow-list (`compat/native-props.ts` doctrine: never a `{...props}`
 * spread, so DOM-only props can never reach the native host).
 *
 * `contentContainerStyle` is a compat style object (the legacy `accept` lane
 * compiled it as a Tamagui style): enum/token families ride
 * `contentContainerClassName` (uniwind resolves it on Metro), the
 * runtime-interpolated families ride the RN `contentContainerStyle` object —
 * the same two-lane split as the frame.
 */
import { forwardRef, type JSX } from 'react'
import { type LayoutChangeEvent, ScrollView as RNScrollView, type StyleProp, type ViewStyle } from 'react-native'
import { warnUnsupportedNativeProps } from '../compat/native-diagnostics'
import { nativeCompatProps } from '../compat/native-props'
import { compatLayoutNativeStyle } from '../compat/native-style'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import {
  nativeScrollViewCompatClassName,
  nativeScrollViewContentContainerClassName,
  withFullscreenVariant,
} from './compile'
import { SCROLL_VIEW_NATIVE_FORWARDED_PROP_KEYS, type ScrollViewCompatProps } from './props'

function forwardedScrollProps(props: ScrollViewCompatProps): Record<string, unknown> {
  const source = props as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of SCROLL_VIEW_NATIVE_FORWARDED_PROP_KEYS) {
    if (source[key] !== undefined) {
      out[key] = source[key]
    }
  }
  return out
}

export const ScrollViewCompat = forwardRef<RNScrollView, ScrollViewCompatProps>((props, ref): JSX.Element => {
  const { children, onLayout, style, contentContainerStyle } = props
  const merged = withFullscreenVariant(props)
  const { style: nativeStyle, dropped } = compatLayoutNativeStyle(merged)
  const contentNative = compatLayoutNativeStyle(contentContainerStyle ?? {})
  warnUnsupportedNativeProps('ScrollViewCompat', [
    ...dropped,
    ...contentNative.dropped.map((prop) => `contentContainerStyle.${prop}`),
  ])

  return (
    <RNScrollView
      ref={ref}
      {...nativeCompatProps(props)}
      {...forwardedScrollProps(props)}
      // Compat-OWNED behavioral props (excluded from the inherited allow-list
      // by construction): the RN host receives them directly. The handlers'
      // compat event shapes are structural subsets of the RN events.
      horizontal={props.horizontal ?? undefined}
      onScroll={props.onScroll}
      onContentSizeChange={props.onContentSizeChange}
      onLayout={onLayout as ((event: LayoutChangeEvent) => void) | undefined}
      // User `style` last so a call site still wins, like the web leg's style attribute.
      style={[nativeStyle as StyleProp<ViewStyle>, style as StyleProp<ViewStyle>]}
      contentContainerStyle={contentNative.style as StyleProp<ViewStyle>}
      // uniwind resolves the compiled classNames on Metro.
      {...{
        className: nativeScrollViewCompatClassName(props),
        contentContainerClassName: [
          nativeScrollViewContentContainerClassName(contentContainerStyle),
          (props as { contentContainerClassName?: string }).contentContainerClassName,
        ]
          .filter(Boolean)
          .join(' '),
      }}
    >
      {children}
    </RNScrollView>
  )
})

ScrollViewCompat.displayName = 'ScrollViewCompat'
markMyceliumPrimitive(ScrollViewCompat)
