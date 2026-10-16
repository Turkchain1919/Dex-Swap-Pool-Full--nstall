import * as React from 'react'
import { type LayoutChangeEvent, type StyleProp, View, type ViewStyle } from 'react-native'
import { warnUnsupportedNativeProps } from '../compat/native-diagnostics'
import { useNativePressResponder } from '../compat/native-pressability'
import { nativeCompatProps } from '../compat/native-props'
import { compatLayoutNativeStyle } from '../compat/native-style'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import { viewCompatClassName } from './compile'
import type { ViewCompatProps } from './props'

/**
 * React Native rendering of ViewCompat (INFRA-3229) — the Flex leg minus the
 * Flex variant shorthands, exactly as `compile.ts` is the Flex compiler minus
 * `variantClasses`. See `FlexCompat.native.tsx` for the className/style split,
 * the `onLayout` contract, why `tag` is ignored, and the press-props pointer
 * (INFRA-3536: `useNativePressResponder` on the same plain-View host —
 * rationale in `compat/native-pressability.ts`).
 */
export const ViewCompat = React.forwardRef<View, ViewCompatProps>(function ViewCompat(props, ref) {
  const { children, onLayout, style } = props
  const pressResponder = useNativePressResponder(props)
  const { style: nativeStyle, dropped } = compatLayoutNativeStyle(props)
  warnUnsupportedNativeProps('ViewCompat', dropped)

  return (
    <View
      ref={ref}
      {...nativeCompatProps(props)}
      {...pressResponder}
      onLayout={onLayout as ((event: LayoutChangeEvent) => void) | undefined}
      style={[nativeStyle, style as StyleProp<ViewStyle>]}
      // uniwind resolves the compiled className on Metro.
      {...{ className: viewCompatClassName(props) }}
    >
      {children}
    </View>
  )
})

// Matches what `createCompatComponent` sets on the web leg (compat/dom.tsx).
ViewCompat.displayName = 'ViewCompat'
markMyceliumPrimitive(ViewCompat)
