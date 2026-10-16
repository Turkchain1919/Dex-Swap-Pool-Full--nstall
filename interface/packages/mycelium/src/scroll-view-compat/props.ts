/**
 * The `ScrollView` compat prop contract. The legacy component
 * (tamagui's `styled(ScrollViewNative, { scrollEnabled: true, variants: {
 * fullscreen } }, { accept: { contentContainerStyle: 'style' } })`, re-exported
 * from the `ui/src` barrel) is the React Native `ScrollView` carrying the
 * Tamagui stack style surface. The compat contract is therefore:
 *
 *  - the plain stack style surface (`ViewCompatStyleProps`) + every shared
 *    compat pool, exactly like View/Flex;
 *  - the compat's own overrides for the props whose event/style shapes differ
 *    per platform (`onScroll`, `onContentSizeChange`, `contentContainerStyle`,
 *    `horizontal`) plus the legacy `fullscreen` variant;
 *  - the rest of the React Native `ScrollViewProps` surface, inherited
 *    TYPE-ONLY (react-native value imports stay confined to `.native.tsx`)
 *    with every compat-owned key removed. Those inherited props forward to the
 *    native host verbatim and are inert on web — which is what the legacy
 *    component did too: react-native-web implements the same handful the web
 *    leg maps (`scrollEnabled`, the indicator props, `scrollEventThrottle`,
 *    `centerContent`, `pagingEnabled`) and ignores the native-only knobs.
 */
import type { ScrollViewProps as RNScrollViewProps } from 'react-native'
import type { CompatProps } from '../compat/props'
import type { ViewCompatStyleProps } from '../view-compat/props'

/** The frame's style surface: the plain stack surface, like the legacy styled ScrollView. */
export type ScrollViewCompatStyleProps = ViewCompatStyleProps

/** The RN-web-normalized scroll payload — the fields both platforms guarantee. */
export interface ScrollViewCompatScrollEventPayload {
  contentOffset: { x: number; y: number }
  contentSize: { width: number; height: number }
  layoutMeasurement: { width: number; height: number }
}

/**
 * The compat scroll event. Method-syntax handler typing keeps parameters
 * bivariant (the `CompatEventProps` mechanism), so handlers written against
 * RN's `NativeSyntheticEvent<NativeScrollEvent>` — a structural subtype of
 * this — stay assignable. On native they receive the real RN event; on web
 * the synthesized subset below, exactly like react-native-web.
 */
export interface ScrollViewCompatScrollEvent {
  nativeEvent: ScrollViewCompatScrollEventPayload
  timeStamp: number
}

/** The imperative surface both legs' refs expose (RN `ScrollView` satisfies it structurally). */
export interface ScrollViewCompatRef {
  scrollTo(options?: { x?: number; y?: number; animated?: boolean } | number, deprecatedX?: number): void
  scrollToEnd(options?: { animated?: boolean }): void
  getScrollableNode(): unknown
}

/** The props the compat owns (platform-differing shapes + the legacy variant). */
export interface ScrollViewCompatOwnProps {
  horizontal?: boolean | null
  /** Legacy styled variant: `position: absolute` + zero inset. */
  fullscreen?: boolean
  /** Compat style object for the content container (the legacy `accept` lane compiled it as a style). */
  contentContainerStyle?: ScrollViewCompatStyleProps
  onScroll?(this: void, event: ScrollViewCompatScrollEvent): void
  onContentSizeChange?(this: void, width: number, height: number): void
}

type CompatOwnedKeys = keyof CompatProps<ScrollViewCompatStyleProps> | keyof ScrollViewCompatOwnProps

/** The inherited RN surface: everything the compat does not own, type-only. */
export type InheritedRNScrollViewProps = Omit<RNScrollViewProps, CompatOwnedKeys>

/**
 * Every inherited RN prop the native leg forwards to the host verbatim — the
 * runtime allow-list (`compat/native-props.ts` doctrine: never a `{...props}`
 * spread, so DOM-only props can never reach a native host). Lives here,
 * platform-neutral, so the exhaustiveness pin below can compare it against
 * the inherited TYPE: the two drifting apart is exactly how an inherited
 * prop silently vanishes.
 */
export const SCROLL_VIEW_NATIVE_FORWARDED_PROP_KEYS = [
  'StickyHeaderComponent',
  'accessibilityLargeContentTitle',
  'accessibilityRespondsToUserInteraction',
  'accessibilityShowsLargeContentViewer',
  'alwaysBounceHorizontal',
  'alwaysBounceVertical',
  'automaticallyAdjustContentInsets',
  'automaticallyAdjustKeyboardInsets',
  'automaticallyAdjustsScrollIndicatorInsets',
  'bounces',
  'bouncesZoom',
  'canCancelContentTouches',
  'centerContent',
  'contentInset',
  'contentInsetAdjustmentBehavior',
  'contentOffset',
  'decelerationRate',
  'directionalLockEnabled',
  'disableIntervalMomentum',
  'disableScrollViewPanResponder',
  'endFillColor',
  'endFillColorClassName',
  'fadingEdgeLength',
  'focusable',
  'indicatorStyle',
  'innerViewRef',
  'invertStickyHeaders',
  'keyboardDismissMode',
  'keyboardShouldPersistTaps',
  'maintainVisibleContentPosition',
  'maximumZoomScale',
  'minimumZoomScale',
  'nestedScrollEnabled',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
  'onMoveShouldSetResponder',
  'onMoveShouldSetResponderCapture',
  'onResponderEnd',
  'onResponderGrant',
  'onResponderMove',
  'onResponderReject',
  'onResponderRelease',
  'onResponderStart',
  'onResponderTerminate',
  'onResponderTerminationRequest',
  'onScrollAnimationEnd',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onScrollToTop',
  'onStartShouldSetResponder',
  'onStartShouldSetResponderCapture',
  'overScrollMode',
  'pagingEnabled',
  'persistentScrollbar',
  'pinchGestureEnabled',
  'refreshControl',
  'screenReaderFocusable',
  'scrollEnabled',
  'scrollEventThrottle',
  'scrollIndicatorInsets',
  'scrollPerfTag',
  'scrollToOverflowEnabled',
  'scrollViewRef',
  'scrollsChildToFocus',
  'scrollsToTop',
  'showsHorizontalScrollIndicator',
  'showsVerticalScrollIndicator',
  'snapToAlignment',
  'snapToEnd',
  'snapToInterval',
  'snapToOffsets',
  'snapToStart',
  'stickyHeaderHiddenOnScroll',
  'stickyHeaderIndices',
  'zoomScale',
] as const

/**
 * Inherited props the native leg handles specially instead of forwarding
 * verbatim: `contentContainerClassName` merges with the compiled
 * contentContainerStyle classes (see the native leg's render).
 */
export const SCROLL_VIEW_NATIVE_MERGED_PROP_KEYS = ['contentContainerClassName'] as const

type ForwardedKey = (typeof SCROLL_VIEW_NATIVE_FORWARDED_PROP_KEYS)[number]
type MergedKey = (typeof SCROLL_VIEW_NATIVE_MERGED_PROP_KEYS)[number]
type AssertNever<T extends never> = T

/**
 * Exhaustiveness pin: every key the inherited TYPE accepts is forwarded (or
 * deliberately merged) by the native leg. A key added to RN's
 * `ScrollViewProps` (or minted by a type augmentation) that the lists miss
 * turns this into a compile error NAMING the missing key, instead of a prop
 * that typechecks and silently vanishes at the native host.
 */
export type _EveryInheritedScrollViewPropIsForwarded = AssertNever<
  Exclude<keyof InheritedRNScrollViewProps, ForwardedKey | MergedKey>
>

/** The full ScrollView prop contract: stack styles + shared compat surfaces + RN scroll surface. */
export type ScrollViewCompatProps = CompatProps<ScrollViewCompatStyleProps> &
  ScrollViewCompatOwnProps &
  InheritedRNScrollViewProps
