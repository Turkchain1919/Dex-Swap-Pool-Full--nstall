import * as React from 'react'
import { type LayoutChangeEvent, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native'
import { warnUnsupportedNativeProps } from '../compat/native-diagnostics'
import { droppedNonNativeDisplayProps, stripNonNativeDisplayClasses } from '../compat/native-display'
import { useNativePressResponder } from '../compat/native-pressability'
import { nativeCompatProps } from '../compat/native-props'
import { compatLayoutNativeStyle } from '../compat/native-style'
import { isNonNativeDisplayValue } from '../compat/native-values'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import { nativeFlexCompatClassName } from './compile'
import type { FlexCompatProps } from './props'

// The two DIRECT carriers of an unscoped web-only `display` (per
// `RN_DISPLAY_VALUES`), each stripped so its enum utility never reaches
// uniwind → Yoga; see the call-site comment for what stays uncovered.

/** Drop a non-native top-level `display` so its utility never rides the className into uniwind → Yoga. */
function withoutNonNativeDisplayProp(props: FlexCompatProps): FlexCompatProps {
  return isNonNativeDisplayValue(props.display) ? { ...props, display: undefined } : props
}

/**
 * Drop a non-native `display` from the flattened user `style` before it reaches the native host (and Yoga).
 * Invariant: return the SAME `style` reference on a no-op, a new object only when a value is stripped — the
 * caller detects the drop via referential inequality (`safeStyle !== style`) to feed `warnUnsupportedNativeProps`.
 */
function withoutNonNativeDisplayStyle(style: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  // `StyleSheet.flatten` collapses the `StyleProp` array/object form to one object
  // (it returns nullish only for a nullish/false style — left untouched then).
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined
  return flat != null && isNonNativeDisplayValue(flat.display) ? { ...flat, display: undefined } : style
}

/**
 * React Native rendering of FlexCompat (INFRA-3229): a real RN `View`, never a
 * DOM host. The web leg funnels through `compat/dom.tsx`, which calls
 * `React.createElement(tag ?? 'div')` and builds `onLayout` on `ResizeObserver`
 * — neither exists in Hermes, so a converted `apps/mobile` file used to
 * typecheck, pass its unit suite, and then mount `<div>` inside a native tree.
 *
 * The className is the shared pure compiler with ONE native strategy swap
 * (`nativeFlexCompatClassName`): shadow color tokens outside the compat maps
 * drop their box-shadow declaration (dev-warned) instead of throwing, because
 * this leg compiles the className while rendering always-mounted chrome. Every
 * other lane is byte-identical to the web leg's `flexCompatClassName`, so the
 * web parity proof and both class manifests still hold and uniwind resolves
 * the semantic/enum utilities on Metro. Alongside it the leg builds an RN
 * style object for the families whose
 * utility is runtime-interpolated (`gap-[7px]`, `w-[100px]`, `rounded-[12px]`,
 * …): uniwind's scanner is static, so those classes never reach the native
 * stylesheet and are skipped silently. See `compat/native-style.ts`.
 *
 * `onLayout` forwards RN's native layout event straight through (the
 * `TouchableAreaCompat.native.tsx` cast precedent). It is structurally
 * assignable to the compat prop type, but RN's `x`/`y` are PARENT-relative
 * where the web leg's `getBoundingClientRect()` values are viewport-relative,
 * and RN fires on layout rather than on every `ResizeObserver` notification.
 *
 * `tag` is ignored: RN has no tags, and honouring it is exactly the bug this
 * leg exists to remove.
 *
 * Press props (INFRA-3536): dispatched through responder-level wiring on this
 * same plain-View host (`useNativePressResponder`) — legacy Tamagui `Flex`
 * dispatches `onPress` natively, so dropping the handler silently was a
 * render-contract break. The full rationale (why not RN Pressable, the
 * a11y-silence contract, gesture lifecycle) lives in
 * `compat/native-pressability.ts`; `nativeCompatProps` solely owns `accessible`.
 *
 * `animation`/`animateOnly` are NOT read here, by ruling, not by oversight:
 * this leg has no Reanimated wiring and never will, because a declarative
 * prop-diff driver on a plain View cannot be trusted correct without
 * on-device iteration, and every working native animation in this codebase
 * (this file's own sibling ButtonCompat, Presence, AnimatePresencePager) is
 * hand-rolled Reanimated instead. `nativeCompatProps` copies from a fixed
 * allow-list, and the View below never spreads the raw `props` object, so
 * these two values never reach the host at all.
 *
 * `animateEnter`/`animateExit`/`animateEnterExit` are dead for a different
 * reason: they DO compile to real `animate-spore-*` classes and DO ride
 * `nativeFlexCompatClassName(classNameProps)` onto the View below — compat.css
 * is in the native entry (INFRA-3238), so the entries exist — but uniwind
 * carries no keyframes at all, so the animation those entries reference never
 * runs (`@universe/tailwind`'s class-map-miss.ts pins the gap via
 * `KNOWN_INERT_UTILITY_PREFIXES`; removal tracked by INFRA-3289).
 * The three keys sit in that module's `NATIVE_DEAD_PROP_KEYS`, so this leg
 * dev-warns on them like ButtonCompat does: `compatLayoutNativeStyle` folds
 * `nativeWarningProps(props)` into the `dropped` ledger handed to
 * `warnUnsupportedNativeProps` below. The legs differ only in how the keys
 * reach that warning (ButtonCompat calls `nativeWarningProps` directly), not
 * in whether it fires.
 * Converting a file whose animation must survive on native means
 * hand-rolling it: see the `animation-prop` native section of
 * `.claude/skills/tamagui-conversion/references/manual-lane.md`.
 */
export const FlexCompat = React.forwardRef<View, FlexCompatProps>(function FlexCompat(props, ref) {
  const { children, onLayout, style } = props
  const pressResponder = useNativePressResponder(props)
  // A non-native `display` (per `RN_DISPLAY_VALUES`) is stripped from every
  // carrier: the two direct ones — the compiled className (fed by a
  // display-free props copy) and the raw user `style` object — here, and the
  // pool-/variant-scoped class lane (`$md`, `$platform-web`, …) via
  // `stripNonNativeDisplayClasses` on the attached string below. Only
  // `nativeFlexCompatClassName` reads `display`; `compatLayoutNativeStyle` and
  // `nativeCompatProps` do not, so they take the original `props`.
  const classNameProps = withoutNonNativeDisplayProp(props)
  const safeStyle = withoutNonNativeDisplayStyle(style as StyleProp<ViewStyle>)
  const { style: nativeStyle, dropped } = compatLayoutNativeStyle(props)
  if (props.maxContent === true) {
    // `maxContent` compiles to `w-max`; uniwind has no `max-content` width, and
    // a class-map miss is completely silent.
    dropped.push('maxContent')
  }
  // A stripped `display` on either direct carrier is a silently dropped layout
  // intent; surface it once (the diagnostics ledger dedupes per component × prop).
  if (classNameProps.display !== props.display || safeStyle !== style) {
    dropped.push('display')
  }
  // Pool-/variant-scoped display values are stripped from the attached
  // className below; keep that loss visible too (same ledger, same dedupe).
  dropped.push(...droppedNonNativeDisplayProps(props as Readonly<Record<string, unknown>>))
  warnUnsupportedNativeProps('FlexCompat', dropped)

  return (
    <View
      ref={ref}
      {...nativeCompatProps(props)}
      {...pressResponder}
      onLayout={onLayout as ((event: LayoutChangeEvent) => void) | undefined}
      // User `style` last so a call site still wins, like the web leg's style attribute.
      style={[nativeStyle, safeStyle]}
      // uniwind resolves the compiled className on Metro; display values RN
      // cannot carry are stripped under every variant prefix, or a web-only
      // pool's `grid`/`inline-flex` reaches Yoga (see compat/native-display).
      {...{ className: stripNonNativeDisplayClasses(nativeFlexCompatClassName(classNameProps)) }}
    >
      {children}
    </View>
  )
})

// Matches what `createCompatComponent` sets on the web leg (compat/dom.tsx).
FlexCompat.displayName = 'FlexCompat'
markMyceliumPrimitive(FlexCompat)
