/**
 * The Reanimated passthrough surface shared by every animated compat wrapper
 * (`AnimatedFlex`, `AnimatedTouchableArea`): the props
 * `createAnimatedComponent` consumes on native — enter/exit/layout worklets,
 * `useAnimatedProps` results, and the shared-transition pair. One source of
 * truth so the wrappers can't drift apart (the legacy surfaces already had:
 * AnimatedFlex hand-declared three of these while `withAnimated` forwarded
 * Reanimated's full `AnimatedProps` set — the full set is correct on both,
 * since both native legs are real `createAnimatedComponent` wrappers).
 *
 * Typed `unknown`, not Reanimated's own types: react-native-reanimated is an
 * optional peer, and importing its types here would pull it into every
 * consumer's graph. Web legs accept and ignore all of these, like legacy.
 */
export type ReanimatedPassthroughProps = {
  /** Reanimated entering animation — used on native, ignored on web. */
  entering?: unknown
  /** Reanimated exiting animation — used on native, ignored on web. */
  exiting?: unknown
  /** Reanimated layout animation — used on native, ignored on web. */
  layout?: unknown
  /** Reanimated `useAnimatedProps` result — used on native, ignored on web. */
  animatedProps?: unknown
  sharedTransitionTag?: string
  sharedTransitionStyle?: unknown
}

/**
 * Strip the Reanimated passthrough props before handing the rest to a web
 * leg's base component (web animations ride CSS; the props are accepted for
 * cross-platform call sites and ignored, like legacy).
 */
export function omitReanimatedPassthroughProps<P extends ReanimatedPassthroughProps>(
  props: P,
): Omit<P, keyof ReanimatedPassthroughProps> {
  const {
    entering: _entering,
    exiting: _exiting,
    layout: _layout,
    animatedProps: _animatedProps,
    sharedTransitionTag: _sharedTransitionTag,
    sharedTransitionStyle: _sharedTransitionStyle,
    ...rest
  } = props
  return rest
}
