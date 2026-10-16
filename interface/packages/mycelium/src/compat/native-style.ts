/**
 * The React Native style lane of the compat platform legs (INFRA-3229).
 *
 * On web every compat style prop becomes a Tailwind class. On native only
 * LITERAL classes survive: uniwind's scanner is static, so a runtime-composed
 * utility (`gap-[7px]`, `w-[100px]`, `rounded-[12px]`, …) never reaches the
 * generated stylesheet and `UniwindStore.getStyles` skips it silently.
 *
 * So the split happens at the LEG boundary, never inside the compilers: the `*CompatClassName`
 * output stays byte-identical (the web parity proof and both class manifests depend on it) and the
 * `.native` legs additionally build an RN style object for the interpolating families. Semantic
 * tokens deliberately stay on the className — `Uniwind.setTheme()` theme-switches their values at
 * runtime, and a style object would freeze them at render time.
 *
 * Anything expressible neither as a token class nor an RN style key is reported
 * through `dropped`, which the legs hand to `warnUnsupportedNativeProps`.
 */
import type { TextStyle, ViewStyle } from 'react-native'
import { applyBorders } from './native-borders'
import { nativeWarningProps } from './native-diagnostics'
import { NATIVE_LONG_TAIL_PROPS } from './native-long-tail'
import {
  isSemanticColorToken,
  nativeBackgroundColor,
  nativeBorderColor,
  nativeBorderWidth,
  nativeSize,
  nativeSpace,
  nativeZIndex,
  PX_STRING,
} from './native-values'
import type {
  BorderWidthValue,
  CompatStyleProps,
  InsetShorthand,
  SizeValue,
  SpaceValue,
  TamaguiVariable,
  TransformEntry,
} from './props'
import { BORDER_WIDTH_PROPS, LONG_TAIL_STYLE_PROPS, RADIUS_LONG_TAIL_PROPS, SPACE_LONG_TAIL_PROPS } from './style-props'
import {
  isTamaguiVariable,
  lookupToken,
  radiusPxOrUndefined,
  SPACE_TOKEN_PX,
  unwrapVariable,
  unwrapVariableForNativeStyle,
} from './tokens'

// Re-exported so the prop-table group this module publishes (SPACING_PAIRS,
// SIZING_PROPS, EDGE_PROPS, GAP_PROPS, …) stays intact for its consumers
// (`native-style-membership.ts`); the single definition lives in `style-props.ts`,
// which `diagnostics.ts` reads too.
export { BORDER_WIDTH_PROPS }

/** The union RN accepts on a View or a Text host. */
export type CompatNativeStyle = ViewStyle & TextStyle

export interface CompatNativeStyleResult {
  /** RN declarations for the families whose Tailwind class cannot exist natively. */
  style: CompatNativeStyle
  /** Prop names with no native expression at all (dev-warned by the legs). */
  dropped: string[]
}

/** Style under construction — keyed loosely so the builders can assign by name. */
export type MutableNativeStyle = Record<string, unknown>

/** The one argument shape every family builder takes. */
interface ApplyArgs<P> {
  props: P
  style: MutableNativeStyle
  dropped: string[]
}

/** Tamagui/compat transform prop order (see `style-classes.ts` `transformValue`). */
export const TRANSFORM_PROPS = [
  'x',
  'y',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skewX',
  'skewY',
  'perspective',
  'matrix',
] as const

const RN_TRANSFORM_KEY: Readonly<Record<string, string>> = { x: 'translateX', y: 'translateY' }

/**
 * The RN transform array in the SAME order the web lane emits CSS transform
 * functions: transform-prop entries sort ascending by prop name and are
 * prepended one by one (so the emitted order is descending by prop name), then
 * an explicit `transform` array appends in array order.
 */
function nativeTransform(props: CompatStyleProps): { transform?: Record<string, unknown>[]; dropped: string[] } {
  if (typeof props.transform === 'string') {
    // A raw CSS transform string is not parseable into RN's array form here.
    return { dropped: ['transform'] }
  }
  const entries: Record<string, unknown>[] = []
  const dropped: string[] = []
  const present = TRANSFORM_PROPS.filter((prop) => props[prop] !== undefined).sort()
  for (const prop of present) {
    // `x`/`y` are `BorderWidthValue` (INFRA-3232): a `$space` token must resolve
    // to a number before Fabric sees the translate entry, like the web leg's
    // `sizeValue` — an unresolvable one is dropped instead of thrown.
    const value =
      prop === 'x' || prop === 'y' ? nativeBorderWidth(props[prop] as BorderWidthValue) : (props[prop] as unknown)
    if (value === undefined) {
      dropped.push(prop)
      continue
    }
    entries.unshift({ [RN_TRANSFORM_KEY[prop] ?? prop]: value })
  }
  if (props.transform !== undefined) {
    for (const entry of props.transform as readonly TransformEntry[]) {
      const [name] = Object.keys(entry)
      if (name !== undefined) {
        entries.push({ [RN_TRANSFORM_KEY[name] ?? name]: entry[name] })
      }
    }
  }
  return entries.length === 0 ? { dropped } : { transform: entries, dropped }
}

/** `[rnKey, longhand, Tamagui shorthand]`, longhand applied first. */
export const SPACING_PAIRS = [
  ['margin', 'margin', 'm'],
  ['marginHorizontal', 'marginHorizontal', 'mx'],
  ['marginVertical', 'marginVertical', 'my'],
  ['marginTop', 'marginTop', 'mt'],
  ['marginBottom', 'marginBottom', 'mb'],
  ['marginLeft', 'marginLeft', 'ml'],
  ['marginRight', 'marginRight', 'mr'],
  ['padding', 'padding', 'p'],
  ['paddingHorizontal', 'paddingHorizontal', 'px'],
  ['paddingVertical', 'paddingVertical', 'py'],
  ['paddingTop', 'paddingTop', 'pt'],
  ['paddingBottom', 'paddingBottom', 'pb'],
  ['paddingLeft', 'paddingLeft', 'pl'],
  ['paddingRight', 'paddingRight', 'pr'],
] as const

export const SIZING_PROPS = ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'] as const
export const EDGE_PROPS = ['top', 'right', 'bottom', 'left'] as const
export const GAP_PROPS = ['gap', 'rowGap', 'columnGap'] as const

/** RN honours only these `overflow` values; `auto` / `unset` are web-only, so they get dropped and warned. */
const RN_OVERFLOW_VALUES: ReadonlySet<string> = new Set(['visible', 'hidden', 'scroll'])

/** The flexbox props both Flex and View own (Text reuses them too). */
interface FlexboxNativeValues {
  flex?: number
  flexBasis?: SizeValue
  flexGrow?: number
  flexShrink?: number
  gap?: SpaceValue
  rowGap?: SpaceValue
  columnGap?: SpaceValue
}

function applySpacing({ props, style, dropped }: ApplyArgs<CompatStyleProps>): void {
  for (const [rnKey, longhand, shorthand] of SPACING_PAIRS) {
    // Longhand first, then the Tamagui shorthand — the same precedence the class
    // lane gets from tailwind-merge (later utility wins).
    for (const key of [longhand, shorthand] as const) {
      const value = props[key]
      // `null` is a legal SpaceValue (INFRA-3821) meaning "not set", same as `undefined`.
      if (value === undefined || value === null) {
        continue
      }
      const resolved = nativeSpace(value)
      if (resolved === undefined) {
        dropped.push(key)
        continue
      }
      style[rnKey] = resolved
    }
  }
}

function applySizing({ props, style, dropped }: ApplyArgs<CompatStyleProps>): void {
  for (const key of SIZING_PROPS) {
    const value = props[key]
    if (value === undefined) {
      continue
    }
    const resolved = nativeSize(value)
    if (resolved === undefined) {
      dropped.push(key)
      continue
    }
    style[key] = resolved
  }
}

function applyVisuals({ props, style, dropped }: ApplyArgs<CompatStyleProps>): void {
  const { borderRadius, opacity, overflow } = props
  // Neither colour surface is a plain passthrough: a `$` token past the semantic
  // maps for which the class lane resolved a palette literal would otherwise reach
  // RN as an unparseable string, painting black on a border and nothing on a
  // background. See `nativeBackgroundColor` / `nativeBorderColor`.
  const backgroundColor = nativeBackgroundColor(props)
  if (backgroundColor !== undefined) {
    style['backgroundColor'] = backgroundColor
  }
  const borderColor = nativeBorderColor(props)
  if (borderColor !== undefined) {
    style['borderColor'] = borderColor
  }
  if (borderRadius !== undefined) {
    const radius = radiusPxOrUndefined(unwrapVariable(borderRadius))
    if (radius === undefined) {
      dropped.push('borderRadius')
    } else {
      style['borderRadius'] = radius
    }
  }
  applyBorders({ props, style, dropped })
  if (opacity !== undefined) {
    style['opacity'] = opacity
  }
  // `overflow-${value}` is runtime-composed, so the class is scanner-invisible: an
  // unsupported value is supplied by nothing at all (clips on web, not on device).
  if (overflow !== undefined && RN_OVERFLOW_VALUES.has(overflow)) {
    style['overflow'] = overflow
  } else if (overflow !== undefined) {
    dropped.push('overflow')
  }
}

function applyPositioning({ props, style, dropped }: ApplyArgs<CompatStyleProps>): void {
  for (const edge of EDGE_PROPS) {
    const value = props[edge]
    // `null` is a legal SpaceValue (INFRA-3821) meaning "not set", same as `undefined`.
    if (value === undefined || value === null) {
      continue
    }
    const resolved = nativeSpace(value)
    if (resolved === undefined) {
      dropped.push(edge)
      continue
    }
    style[edge] = resolved
  }
  if (props.zIndex !== undefined) {
    const resolved = nativeZIndex(props.zIndex)
    if (resolved === undefined) {
      dropped.push('zIndex')
    } else {
      style['zIndex'] = resolved
    }
  }
}

/** `inset` compiles to the four edge longhands on web; same here (explicit edges win later). */
function applyInset({ props, style, dropped }: ApplyArgs<SpaceValue | InsetShorthand | undefined>): void {
  // `null` is a legal SpaceValue (INFRA-3821) meaning "not set", same as `undefined` — and
  // `typeof null === 'object'` would otherwise fall into the edge-map branch below.
  if (props === undefined || props === null) {
    return
  }
  // A Variable is an object too — but it is a space VALUE for all four edges, not an edge map.
  const box: InsetShorthand =
    typeof props === 'object' && !isTamaguiVariable(props)
      ? props
      : { top: props, right: props, bottom: props, left: props }
  for (const edge of EDGE_PROPS) {
    const value = box[edge]
    if (value === undefined || value === null) {
      continue
    }
    const resolved = nativeSpace(value)
    if (resolved === undefined) {
      dropped.push('inset')
      continue
    }
    style[edge] = resolved
  }
}

function applyFlexbox({ props, style, dropped }: ApplyArgs<FlexboxNativeValues>): void {
  const { flex, flexBasis, flexGrow, flexShrink } = props
  if (flexBasis !== undefined) {
    const resolved = nativeSize(flexBasis)
    if (resolved === undefined) {
      dropped.push('flexBasis')
    } else {
      style['flexBasis'] = resolved
    }
  }
  if (flexGrow !== undefined) {
    style['flexGrow'] = flexGrow
  }
  if (flexShrink !== undefined) {
    style['flexShrink'] = flexShrink
  }
  for (const key of GAP_PROPS) {
    const value = props[key]
    // `null` is a legal SpaceValue (INFRA-3821) meaning "not set", same as `undefined`.
    if (value === undefined || value === null) {
      continue
    }
    // RN `gap` is a plain number — no percentage lane, unlike margin/padding.
    const resolved = nativeSpace(value)
    if (typeof resolved !== 'number') {
      dropped.push(key)
      continue
    }
    style[key] = resolved
  }
  if (flex !== undefined) {
    // Tamagui web keeps flex-basis:auto for a numeric `flex` and emits the
    // longhands (`grow-[n] shrink`); mirror that instead of RN's `flex`
    // shorthand, whose implied basis is 0.
    style['flexGrow'] = flex
    style['flexShrink'] = 1
  }
}

function applyShadows({ props, style, dropped }: ApplyArgs<CompatStyleProps>): void {
  const { shadowColor, shadowOffset, shadowOpacity, shadowRadius, boxShadow } = props
  if (boxShadow !== undefined) {
    style['boxShadow'] = boxShadow
  }
  if (shadowColor !== undefined) {
    const resolvedShadowColor = unwrapVariableForNativeStyle(shadowColor)
    if (typeof resolvedShadowColor !== 'string') {
      style['shadowColor'] = resolvedShadowColor // OpaqueColorValue (INFRA-3804): RN resolves it natively.
    } else if (isSemanticColorToken(resolvedShadowColor) || resolvedShadowColor.startsWith('$')) {
      // Semantic shadow colors resolve through a CSS var on web; no native var lane exists for them.
      dropped.push('shadowColor')
    } else {
      style['shadowColor'] = resolvedShadowColor
    }
  }
  if (shadowOffset !== undefined) {
    const width = nativeBorderWidth(shadowOffset.width)
    const height = nativeBorderWidth(shadowOffset.height)
    if (width === undefined || height === undefined) {
      dropped.push('shadowOffset')
    } else {
      style['shadowOffset'] = { width, height }
    }
  }
  if (shadowOpacity !== undefined) {
    style['shadowOpacity'] = shadowOpacity
  }
  if (shadowRadius !== undefined) {
    const resolved = nativeBorderWidth(shadowRadius)
    if (resolved === undefined) {
      dropped.push('shadowRadius')
    } else {
      style['shadowRadius'] = resolved
    }
  }
}

/**
 * A long-tail `$` token's RN value: family lookup, undefined when it must be
 * dropped. Colors fall through DELIBERATELY (no per-side semantic native
 * class; a literal would freeze the theme). The size family has no branch on
 * purpose: no logical-size prop is an RN style key, so none is in
 * `NATIVE_LONG_TAIL_PROPS` and a size token can never reach here —
 * `native-style.test.ts` pins that disjointness, so if RN ever grows a
 * logical-size key the pin forces an explicit resolve-vs-drop decision.
 */
function nativeLongTailToken(prop: string, value: string): number | undefined {
  if (RADIUS_LONG_TAIL_PROPS.has(prop)) {
    return radiusPxOrUndefined(value)
  }
  if (SPACE_LONG_TAIL_PROPS.has(prop)) {
    return lookupToken(SPACE_TOKEN_PX, value)
  }
  return undefined
}

function applyLongTail({
  props,
  style,
  dropped,
  longTailProps,
}: ApplyArgs<CompatStyleProps> & { longTailProps: readonly string[] }): void {
  for (const prop of longTailProps) {
    const raw = (props as Record<string, unknown>)[prop]
    if (raw === undefined) {
      continue
    }
    if (!NATIVE_LONG_TAIL_PROPS.has(prop)) {
      dropped.push(prop)
      continue
    }
    const value = unwrapVariable(raw as string | number | TamaguiVariable)
    // Long-tail `$` tokens resolve through their family table like the
    // shorthand lanes (radius per `borderRadius`, space per `nativeSpace`);
    // colors are dropped-and-reported — a per-side semantic color has no
    // native class to ride and a literal would freeze the theme (the
    // shadowColor precedent). Anything else unresolved is dropped too:
    // a raw `$` string can never reach an RN style object.
    if (typeof value === 'string' && value.startsWith('$')) {
      const resolved = nativeLongTailToken(prop, value)
      if (resolved === undefined) {
        dropped.push(prop)
      } else {
        style[prop] = resolved
      }
      continue
    }
    // uniwind normalises `12px` to a number on the class lane; the sibling builders
    // do the same via nativeSize. Match it or the raw string wins on device.
    const px = typeof value === 'string' ? PX_STRING.exec(value) : null
    style[prop] = px === null ? value : Number(px[1])
  }
}

export interface CompatNativeStyleOptions {
  /** The component's long-tail table (Text extends the shared one). */
  longTailProps?: readonly string[]
}

/**
 * Compile the universal compat style surface to an RN style object, covering
 * exactly the families whose Tailwind class is runtime-interpolated. Semantic
 * color tokens are deliberately absent (they stay classes); the enum families
 * (flexDirection, alignItems, justifyContent, position, display, …) are absent
 * too — those compile to LITERAL utilities that do resolve natively.
 */
export function compatNativeStyle(
  props: CompatStyleProps,
  options: CompatNativeStyleOptions = {},
): CompatNativeStyleResult {
  const style: MutableNativeStyle = {}
  const dropped: string[] = []
  applySpacing({ props, style, dropped })
  applySizing({ props, style, dropped })
  applyVisuals({ props, style, dropped })
  applyPositioning({ props, style, dropped })
  applyShadows({ props, style, dropped })
  applyLongTail({ props, style, dropped, longTailProps: options.longTailProps ?? LONG_TAIL_STYLE_PROPS })
  const transform = nativeTransform(props)
  if (transform.transform !== undefined) {
    style['transform'] = transform.transform
  }
  dropped.push(...transform.dropped)
  if (props.transformOrigin !== undefined) {
    style['transformOrigin'] = props.transformOrigin
  }
  return { style: style as CompatNativeStyle, dropped }
}

/** The prop slice `compatLayoutNativeStyle` reads: the universal surface plus flexbox and `inset`. */
export type CompatLayoutProps = CompatStyleProps & FlexboxNativeValues & { inset?: SpaceValue | InsetShorthand }

/**
 * The full leg-side style object for a layout primitive, in the SAME pool order
 * the class lane composes (inset → flexbox → universal), so a later family wins
 * exactly like the later Tailwind utility does.
 */
export function compatLayoutNativeStyle(
  props: CompatLayoutProps,
  options: CompatNativeStyleOptions = {},
): CompatNativeStyleResult {
  const style: MutableNativeStyle = {}
  const dropped: string[] = []
  applyInset({ props: props.inset, style, dropped })
  applyFlexbox({ props, style, dropped })
  const universal = compatNativeStyle(props, options)
  Object.assign(style, universal.style)
  dropped.push(...universal.dropped, ...nativeWarningProps(props as Readonly<Record<string, unknown>>))
  return { style: style as CompatNativeStyle, dropped }
}
