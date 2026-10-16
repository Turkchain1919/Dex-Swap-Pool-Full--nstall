/**
 * The ScrollView binding of the shared compat compiler: the plain
 * View style compiler (the Flex compiler minus the Flex variant shorthands)
 * under ScrollView frame defaults that reproduce what the legacy component
 * renders on web — react-native-web's ScrollView base styles over the shared
 * View reset. On native the frame defaults are deliberately EMPTY: the real RN
 * `ScrollView` host supplies its own base (direction, overflow, grow/shrink),
 * exactly as it did under the legacy styled wrapper, so the native className
 * carries only the caller's style props.
 */
import { type CompatEmission, composeCompatClassName, composeCompatEmission } from '../compat/compose'
import { warnDroppedNativeShadowColorToken } from '../compat/native-diagnostics'
import type { ColorValue, CompatProps } from '../compat/props'
import {
  type ClassList,
  type CommonStyleClassOptions,
  commonStyleClasses,
  flexboxStyleClasses,
  insetClasses,
} from '../compat/style-classes'
import { shadowColorExpressionOrUndefined, unwrapVariableForNativeStyle } from '../compat/tokens'
import { BASE_CLASSES, flexDisplayClass } from '../flex-compat/flex-style-classes'
import type { ScrollViewCompatProps, ScrollViewCompatStyleProps } from './props'

/**
 * react-native-web `commonStyle` (ScrollView/index.js) as Tailwind classes:
 * grow/shrink 1, the hardware-compositing transform, and iOS momentum
 * scrolling. The direction bases below add its per-axis overflow pair.
 */
const SCROLL_VIEW_COMMON = 'grow shrink [transform:translateZ(0)] [-webkit-overflow-scrolling:touch]'

/** RNW `baseVertical` over the shared View reset (`BASE_CLASSES` is already column). */
export const SCROLL_VIEW_BASE_VERTICAL = `${BASE_CLASSES} ${SCROLL_VIEW_COMMON} overflow-x-hidden overflow-y-auto`

/** RNW `baseHorizontal`: row direction with the overflow axes flipped. */
export const SCROLL_VIEW_BASE_HORIZONTAL = `${BASE_CLASSES} flex-row ${SCROLL_VIEW_COMMON} overflow-x-auto overflow-y-hidden`

/** RNW `scrollDisabled`, applied OVER the caller's styles like the RNW style array does. */
export const SCROLL_VIEW_DISABLED_CLASSES = 'overflow-x-hidden overflow-y-hidden [touch-action:none]'

/** RNW `hideScrollbar` (either indicator prop set to false). */
export const SCROLL_VIEW_HIDE_SCROLLBAR_CLASSES = '[scrollbar-width:none]'

/** RNW `contentContainerHorizontal`; the vertical content container is the plain View base. */
export const SCROLL_VIEW_CONTENT_HORIZONTAL_CLASSES = 'flex-row'

/** RNW `contentContainerCenterContent`. */
export const SCROLL_VIEW_CENTER_CONTENT_CLASSES = 'justify-center grow'

/** The legacy `fullscreen` styled variant, merged UNDER the caller's props (props beat variants). */
export const FULLSCREEN_VARIANT_STYLE: ScrollViewCompatStyleProps = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}

/** Merge the `fullscreen` variant under the caller's props, like the legacy styled() precedence. */
export function withFullscreenVariant<P extends ScrollViewCompatProps>(props: P): P {
  return props.fullscreen === true ? { ...FULLSCREEN_VARIANT_STYLE, ...props } : props
}

/** Compile one ScrollView style object (no base classes) — the recursive unit, shared with view-compat. */
function scrollViewStyleClasses(props: ScrollViewCompatStyleProps, options: CommonStyleClassOptions = {}): string[] {
  const cls: ClassList = [
    ...insetClasses(props.inset),
    ...flexboxStyleClasses(props, flexDisplayClass),
    ...commonStyleClasses(props, options),
  ]
  return cls.filter((entry): entry is string => typeof entry === 'string' && entry !== '')
}

function baseClassesFor(props: ScrollViewCompatProps): string {
  return props.horizontal === true ? SCROLL_VIEW_BASE_HORIZONTAL : SCROLL_VIEW_BASE_VERTICAL
}

/**
 * `contentContainerStyle` compiles through its own emission
 * (`scrollViewContentContainerEmission`/`nativeScrollViewContentContainerClassName`
 * below) — it is a compat-OWNED override (`props.ts`'s `ScrollViewCompatOwnProps`),
 * not a member of `CompatProps<ScrollViewCompatStyleProps>`, so it has no
 * business riding along into the frame's own pool walk. Left in, it used to
 * misclassify as a typo'd pseudo pool key: object-valued and `Style`-suffixed
 * is exactly the shape `validatePseudoShapedKeys` (INFRA-3260) flags for an
 * unmapped pseudo prop outside the pool table (review: false positive on this
 * legitimate, unrelated prop — `hoverStyles`-family typos still throw).
 */
function withoutContentContainerStyle<P extends { contentContainerStyle?: unknown }>(
  props: P,
): Omit<P, 'contentContainerStyle'> {
  const { contentContainerStyle: _contentContainerStyle, ...rest } = props
  return rest
}

/**
 * Compile the full ScrollView prop contract to a Tailwind className. Throws on
 * tokens with no `@universe/tailwind` counterpart instead of guessing.
 * Raw composition (parity/tests) — the web leg renders through
 * `scrollViewCompatEmission`, the deterministic-emission path.
 */
export function scrollViewCompatClassName(props: ScrollViewCompatProps): string {
  const merged = withFullscreenVariant(props)
  return composeCompatClassName<ScrollViewCompatStyleProps>({
    props: withoutContentContainerStyle(merged),
    baseClasses: baseClassesFor(merged),
    styleClasses: scrollViewStyleClasses,
  })
}

/**
 * Every static class this binding can emit outside the shared families: both
 * direction bases, the scroll-state overlays, and the content-container
 * variants. Registered in `compat/closed-set-manifest.ts`, so regeneration
 * (`bun nx run @universe/mycelium:generate:compat-classes`) is the only
 * maintenance step when the frame defaults change.
 */
export function scrollViewFixedCompatClasses(): string[] {
  return [
    SCROLL_VIEW_BASE_VERTICAL,
    SCROLL_VIEW_BASE_HORIZONTAL,
    SCROLL_VIEW_DISABLED_CLASSES,
    SCROLL_VIEW_HIDE_SCROLLBAR_CLASSES,
    SCROLL_VIEW_CONTENT_HORIZONTAL_CLASSES,
    SCROLL_VIEW_CENTER_CONTENT_CLASSES,
  ]
}

/**
 * Compile the full ScrollView prop contract for rendering: every returned
 * class is guaranteed present in the emitted stylesheet; values outside the
 * closed set ride the inline-value lane instead.
 */
export function scrollViewCompatEmission(props: ScrollViewCompatProps): CompatEmission {
  const merged = withFullscreenVariant(props)
  return composeCompatEmission<ScrollViewCompatStyleProps>({
    props: withoutContentContainerStyle(merged),
    baseClasses: baseClassesFor(merged),
    styleClasses: scrollViewStyleClasses,
    fixedClasses: scrollViewFixedCompatClasses,
  })
}

/**
 * The content container's emission: the plain View base (RNW renders the
 * content container as a View) plus the horizontal/center variants, then the
 * caller's `contentContainerStyle` compiled through the same style compiler
 * the legacy `accept: { contentContainerStyle: 'style' }` lane fed.
 */
export function scrollViewContentContainerEmission(args: {
  horizontal?: boolean | null
  centerContent?: boolean
  contentContainerStyle?: ScrollViewCompatStyleProps
}): CompatEmission {
  const variantClasses = [
    args.horizontal === true ? SCROLL_VIEW_CONTENT_HORIZONTAL_CLASSES : '',
    args.centerContent === true ? SCROLL_VIEW_CENTER_CONTENT_CLASSES : '',
  ]
    .filter(Boolean)
    .join(' ')
  return composeCompatEmission<ScrollViewCompatStyleProps>({
    // SAFETY: a bare style object is a valid pool-less CompatProps (every pool
    // key is optional); only the group-prop index signature blocks the
    // structural check.
    props: (args.contentContainerStyle ?? {}) as CompatProps<ScrollViewCompatStyleProps>,
    baseClasses: variantClasses === '' ? BASE_CLASSES : `${BASE_CLASSES} ${variantClasses}`,
    styleClasses: scrollViewStyleClasses,
    fixedClasses: scrollViewFixedCompatClasses,
  })
}

/**
 * The native lane's shadow color policy: drop-and-dev-warn instead of throw
 * (the `flex-compat/compile.ts` doctrine — a missing shadow must not crash a
 * mounted scroll surface).
 */
function nativeShadowColorExpression(value: ColorValue): string | undefined {
  const resolved = shadowColorExpressionOrUndefined(value)
  if (resolved === undefined) {
    warnDroppedNativeShadowColorToken(String(unwrapVariableForNativeStyle(value)))
  }
  return resolved
}

function nativeScrollViewStyleClasses(style: ScrollViewCompatStyleProps): string[] {
  return scrollViewStyleClasses(style, { shadowColorExpression: nativeShadowColorExpression })
}

/**
 * The NATIVE className: no frame defaults (the RN `ScrollView` host owns its
 * base, as under the legacy styled wrapper), caller style pools only, with the
 * drop-instead-of-throw shadow color policy.
 */
export function nativeScrollViewCompatClassName(props: ScrollViewCompatProps): string {
  return composeCompatClassName<ScrollViewCompatStyleProps>({
    props: withoutContentContainerStyle(withFullscreenVariant(props)),
    baseClasses: '',
    styleClasses: nativeScrollViewStyleClasses,
  })
}

/** The NATIVE content-container className: the caller's style object only, native shadow policy. */
export function nativeScrollViewContentContainerClassName(style: ScrollViewCompatStyleProps | undefined): string {
  return composeCompatClassName<ScrollViewCompatStyleProps>({
    // SAFETY: see scrollViewContentContainerEmission — a bare style object is
    // a valid pool-less CompatProps.
    props: (style ?? {}) as CompatProps<ScrollViewCompatStyleProps>,
    baseClasses: '',
    styleClasses: nativeScrollViewStyleClasses,
  })
}
