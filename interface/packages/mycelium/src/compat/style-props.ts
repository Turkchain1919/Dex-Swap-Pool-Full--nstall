/**
 * Long-tail style-prop tables for the Tamagui-compatible Flex.
 *
 * Props listed here have no bespoke utility mapping in `compile.ts`; they
 * compile generically to Tailwind arbitrary-property utilities
 * (`[aspect-ratio:2]`, `[cursor:pointer]`, …) so the full RN + Tamagui web
 * style surface stays expressible without enumerating a utility per property.
 */

// ── Border widths: two lists and the verdict that reads them ──────────────
//
// `BORDER_WIDTH_PROPS` is the PHYSICAL five: the props that are RN style keys
// under these names, which `native-style.ts`'s `applyBorders` resolves to numbers
// and writes, declaring `IMPLICIT_BORDER_COLOR` when none carries a colour.
// Widening it would make `applyBorders` write keys RN ignores and double-write the
// logical keys `applyLongTail` owns.
//
// `BORDER_WIDTH_OWNING_PROPS` is every prop that makes a border EDGE paint, and so
// every prop that counts toward "owns a border width" when an unmapped
// `borderColor` drops. SPREAD from the five rather than restated, so the two cannot
// disagree about them. Beyond the five: `borderStartWidth`/`borderEndWidth` are
// long-tail `SpaceKeys` that ARE RN border-width keys
// (`react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts`), reaching the RN style
// object via `applyLongTail`; the CSS logical family (`borderInline*`,
// `borderBlock*`) is absent from RN's style types entirely, yet still counts. None
// of these is a Tailwind side utility, so each compiles to an arbitrary property
// like `[border-inline-start-width:1px]`, and Tailwind v4 preflight sets
// `border: 0 solid` on every element — so ANY nonzero width paints, `currentColor`
// with no border-colour class: the exact edge the drop guard suppresses. Counting
// them is right on web and inert on native, which beats a second list to sync.
//
// `outlineWidth`/`maskBorderWidth`/`scrollbarWidth` are deliberately ABSENT: none is
// a border edge, and counting them would erase a variant cell's border for a prop
// that painted none.
//
// `hasOwnBorderWidth` lives here beside the list so BOTH lanes reach the identical
// verdict without either importing the other — it was in `diagnostics.ts`, which put
// `@universe/logger` in the native lane's graph for a pure eight-key check. It takes
// a plain record, not `CompatStyleProps`: the logical spellings are long-tail props
// absent from that interface and importing it would close a type cycle (`props.ts`
// imports `LongTailStyleProp` from here), so callers cast, as `nativeWarningProps`
// already does.

export const BORDER_WIDTH_PROPS = [
  'borderWidth',
  'borderTopWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRightWidth',
] as const

export const BORDER_WIDTH_OWNING_PROPS = [
  ...BORDER_WIDTH_PROPS,
  'borderStartWidth',
  'borderEndWidth',
  'borderInlineWidth',
  'borderInlineStartWidth',
  'borderInlineEndWidth',
  'borderBlockWidth',
  'borderBlockStartWidth',
  'borderBlockEndWidth',
] as const

export function hasOwnBorderWidth(props: Readonly<Record<string, unknown>>): boolean {
  return BORDER_WIDTH_OWNING_PROPS.some((key) => props[key] !== undefined)
}

/** Properties whose numeric values are unitless in CSS (no `px` suffix). */
export const UNITLESS_STYLE_PROPS: ReadonlySet<string> = new Set([
  'animationIterationCount',
  'aspectRatio',
  'flex',
  'flexGrow',
  'flexShrink',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowStart',
  'opacity',
  'shadowOpacity',
  'zIndex',
])

/**
 * RN/Tamagui prop → CSS property name where plain camelCase → kebab-case
 * hyphenation is not the correct translation (react-native-web mappings).
 */
export const CSS_PROP_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  borderBottomEndRadius: 'border-end-end-radius',
  borderBottomStartRadius: 'border-end-start-radius',
  borderTopEndRadius: 'border-start-end-radius',
  borderTopStartRadius: 'border-start-start-radius',
  borderEndColor: 'border-inline-end-color',
  borderEndWidth: 'border-inline-end-width',
  borderStartColor: 'border-inline-start-color',
  borderStartWidth: 'border-inline-start-width',
  end: 'inset-inline-end',
  start: 'inset-inline-start',
  marginEnd: 'margin-inline-end',
  marginStart: 'margin-inline-start',
  paddingEnd: 'padding-inline-end',
  paddingStart: 'padding-inline-start',
}

/**
 * The generic long-tail surface: every remaining RN `ViewStyle` / Tamagui
 * web-extra style prop the compiler accepts with `string | number` values.
 * Grouped by origin; each compiles to `[css-prop:value]`.
 */
export const LONG_TAIL_STYLE_PROPS = [
  // RN ViewStyle
  'backfaceVisibility',
  'borderBlockColor',
  'borderBlockEndColor',
  'borderBlockStartColor',
  'borderBottomColor',
  'borderBottomEndRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderBottomStartRadius',
  'borderCurve',
  'borderEndColor',
  'borderEndEndRadius',
  'borderEndStartRadius',
  'borderEndWidth',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderStartEndRadius',
  'borderStartStartRadius',
  'borderStartWidth',
  'borderStyle',
  'borderTopColor',
  'borderTopEndRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderTopStartRadius',
  'boxSizing',
  'cursor',
  'direction',
  'end',
  'isolation',
  'marginEnd',
  'marginStart',
  'paddingEnd',
  'paddingStart',
  'pointerEvents',
  'start',
  // RN + Tamagui web extras (CSS pass-through surface)
  'alignContent',
  'animationDelay',
  'animationDirection',
  'animationDuration',
  'animationFillMode',
  'animationIterationCount',
  'animationName',
  'animationPlayState',
  'animationTimingFunction',
  'aspectRatio',
  'backdropFilter',
  'background',
  'backgroundAttachment',
  'backgroundBlendMode',
  'backgroundClip',
  'backgroundImage',
  'backgroundOrigin',
  'backgroundPosition',
  'backgroundRepeat',
  'backgroundSize',
  'blockSize',
  'borderBlockEndStyle',
  'borderBlockEndWidth',
  'borderBlockStartStyle',
  'borderBlockStartWidth',
  'borderBlockStyle',
  'borderBlockWidth',
  'borderImage',
  'borderInlineColor',
  'borderInlineEndColor',
  'borderInlineEndStyle',
  'borderInlineEndWidth',
  'borderInlineStartColor',
  'borderInlineStartStyle',
  'borderInlineStartWidth',
  'borderInlineStyle',
  'borderInlineWidth',
  'caretColor',
  'clipPath',
  'contain',
  'containerType',
  'content',
  'filter',
  'float',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnGap',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowGap',
  'gridRowStart',
  'gridTemplateAreas',
  'gridTemplateColumns',
  'inlineSize',
  'insetBlock',
  'insetBlockEnd',
  'insetBlockStart',
  'insetInline',
  'insetInlineEnd',
  'insetInlineStart',
  'marginBlock',
  'marginBlockEnd',
  'marginBlockStart',
  'marginInline',
  'marginInlineEnd',
  'marginInlineStart',
  'mask',
  'maskBorder',
  'maskBorderMode',
  'maskBorderOutset',
  'maskBorderRepeat',
  'maskBorderSlice',
  'maskBorderSource',
  'maskBorderWidth',
  'maskClip',
  'maskComposite',
  'maskImage',
  'maskMode',
  'maskOrigin',
  'maskPosition',
  'maskRepeat',
  'maskSize',
  'maskType',
  'maxBlockSize',
  'maxInlineSize',
  'minBlockSize',
  'minInlineSize',
  'mixBlendMode',
  'objectFit',
  'outlineColor',
  'outlineOffset',
  'outlineStyle',
  'outlineWidth',
  'overflowBlock',
  'overflowInline',
  'overflowWrap',
  'overflowX',
  'overflowY',
  'overscrollBehavior',
  'overscrollBehaviorX',
  'overscrollBehaviorY',
  'paddingBlock',
  'paddingBlockEnd',
  'paddingBlockStart',
  'paddingInline',
  'paddingInlineEnd',
  'paddingInlineStart',
  'scrollbarWidth',
  'textDecoration',
  'textEmphasis',
  'textWrap',
  'touchAction',
  'transformStyle',
  'transition',
  'userSelect',
  'verticalAlign',
  // Vendor-prefixed twin of maskImage above: the leading capital hyphenates
  // to the -webkit- prefixed CSS property, same convention as Text's
  // WebkitBoxOrient/WebkitLineClamp extras.
  'WebkitMaskImage',
] as const

export type LongTailStyleProp = (typeof LONG_TAIL_STYLE_PROPS)[number]

export const LONG_TAIL_STYLE_PROP_SET: ReadonlySet<string> = new Set(LONG_TAIL_STYLE_PROPS)

/**
 * The per-corner radius slice of the long tail. Tamagui lists every one of
 * these in `RadiusKeys` — the same token category as `borderRadius` — so the
 * long-tail compilers resolve their `$` tokens through the radius table
 * instead of rejecting them (web) / passing them through raw (native).
 */
export const RADIUS_LONG_TAIL_PROPS: ReadonlySet<string> = new Set<LongTailStyleProp>([
  'borderBottomEndRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderBottomStartRadius',
  'borderEndEndRadius',
  'borderEndStartRadius',
  'borderStartEndRadius',
  'borderStartStartRadius',
  'borderTopEndRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderTopStartRadius',
])

/**
 * The color slice of the long tail. Every one of these is in Tamagui's own
 * `tokenCategories.color` (@tamagui/helpers `validStyleProps`) — the same
 * category as the `borderColor` shorthand — so the long-tail compilers resolve
 * their `$` tokens through the CONSUMER'S color model instead of rejecting
 * them (web) / passing them through raw (native): Flex rides the semantic
 * tables (`colorTokenCssValue`), Text swaps in its pinned `--stext-*` palette
 * via `longTailColorExpression` — per lane, exactly like the shorthand's
 * `colorClasses` strategy hook.
 */
export const COLOR_LONG_TAIL_PROPS: ReadonlySet<string> = new Set([
  // A call site setting only `background="$surface2"` wants a color (Tamagui
  // has no declared token category for it — legacy resolves the `$` token
  // through the untyped theme-value fallback), so it resolves through the SAME
  // color-token map as `backgroundColor`. The emitted declaration is the CSS
  // SHORTHAND though, which also resets `background-image`/`-position`/`-size`
  // — a `background` color on an element whose gradient comes from a Tailwind
  // class wipes that gradient.
  'background',
  'borderBlockColor',
  'borderBlockEndColor',
  'borderBlockStartColor',
  'borderBottomColor',
  'borderEndColor',
  'borderInlineColor',
  'borderInlineEndColor',
  'borderInlineStartColor',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderTopColor',
  'caretColor',
  'outlineColor',
])

/**
 * The CSS `animation-*` slice of the long tail (INFRA-3330). LONGHANDS ONLY —
 * the `animation` SHORTHAND is deliberately NOT admitted:
 *  - the prop name is already taken on the compat surface by the Tamagui
 *    animation-DRIVER prop (`CompatAnimationProps.animation`, a Spore curve
 *    name), so a CSS-shorthand meaning would silently diverge from what the
 *    same spelling means on legacy Tamagui;
 *  - shorthand + longhand on one element would hit the compat cascade
 *    inversion (both classes ship; stylesheet order, not JSX prop order,
 *    decides). Excluding the shorthand spelling closes only half of that:
 *    the enter/exit PRESET props compile to classes whose declaration is the
 *    shorthand, so pairing a preset with these longhands fails loud at
 *    compose time — development throws, production keeps both classes and
 *    warns once (see the collision guard in compose.ts).
 * `animation-long-tail.test.ts` pins the membership, the exclusion, and the
 * preset collision.
 */
export const ANIMATION_LONG_TAIL_PROPS: ReadonlySet<string> = new Set<LongTailStyleProp>([
  'animationDelay',
  'animationDirection',
  'animationDuration',
  'animationFillMode',
  'animationIterationCount',
  'animationName',
  'animationPlayState',
  'animationTimingFunction',
])

/** Animation longhands whose value is a CSS time — a bare number (numeric or a numeric string) is not a valid time. */
const TIME_VALUED_ANIMATION_PROPS: ReadonlySet<string> = new Set(['animationDelay', 'animationDuration'])

/** A number, or a string that is entirely a number ("200", ".5", "2e3") — a bare number with no CSS unit. */
function isBareNumber(value: string | number): boolean {
  if (typeof value === 'number') {
    return true
  }
  const trimmed = value.trim()
  return trimmed !== '' && Number.isFinite(Number(trimmed))
}

/**
 * The migration's non-color scoping rule (CLAUDE.md "Scope transitions to
 * non-color properties"), enforced for the animation long tail on the value
 * shapes the compiler can see: a theme token (`$…`) or custom property
 * (`var(--…)`) throws — theme colors ship as custom properties and a var
 * cannot be proven non-color, so it fails closed. A bare number on the
 * time-valued props also throws, numeric or spelled as a numeric string:
 * neither is a valid CSS time (the numeric path would even gain a px suffix),
 * so the declaration would be silently dropped.
 * A literal underscore also throws: on the raw class lane the arbitrary-value
 * encoding decodes underscores back to spaces, silently invalidating the
 * declaration. The emission lane's var twins carry the value verbatim (no
 * decode), but the rejection covers both lanes so one spelling behaves the
 * same everywhere — hyphenate names instead.
 * CAVEAT: this gates animation prop VALUES only. Keyframe BODIES are outside
 * the compiler's sight and nothing in the repo tooling (dangerfile, oxlint
 * plugins, scripts) checks them — a keyframes rule that animates a color
 * passes untouched and flashes on theme toggle. Until INFRA-3597 lands
 * tooling enforcement, keyframe bodies are the review surface: keep color out
 * of them, per the CLAUDE.md transition rule.
 */
export function assertAnimationValue(prop: string, value: string | number): void {
  if (TIME_VALUED_ANIMATION_PROPS.has(prop) && isBareNumber(value)) {
    throw new Error(
      `compat: ${prop} value "${value}" is a bare number — time-valued animation props need explicit CSS time units ` +
        '(a unitless number is not a valid CSS time, so the browser would silently drop the declaration)',
    )
  }
  if (typeof value === 'number') {
    return
  }
  const lower = value.toLowerCase()
  if (lower.includes('_')) {
    throw new Error(
      `compat: ${prop} value "${value}" contains an underscore — the arbitrary-value encoding decodes underscores ` +
        'to spaces in the emitted declaration, so the browser would silently drop it; hyphenate keyframe names instead',
    )
  }
  const offence = lower.includes('$')
    ? 'a theme token'
    : lower.includes('var(')
      ? 'a custom-property reference'
      : undefined
  if (offence !== undefined) {
    throw new Error(
      `compat: ${prop} value "${value}" contains ${offence} — animations stay scoped to non-color properties ` +
        '(theme-token colors must never animate; see the transition scoping rule in CLAUDE.md)',
    )
  }
}

/**
 * The space slice of the long tail: the logical margin/padding/inset/border
 * longhands plus the outline geometry — Tamagui `SpaceKeys` whose physical
 * twins resolve through `spacePx`/`borderWidthPx` on the shorthand lanes.
 */
export const SPACE_LONG_TAIL_PROPS: ReadonlySet<string> = new Set([
  'borderEndWidth',
  'borderStartWidth',
  'end',
  'marginEnd',
  'marginStart',
  'outlineOffset',
  'outlineWidth',
  'paddingEnd',
  'paddingStart',
  'start',
])

/**
 * The size slice of the long tail: the logical width/height counterparts,
 * listed in Tamagui's `tokenCategories.size` exactly like width/height
 * (the legacy config sets `size = space`, so the same px table applies).
 */
export const SIZE_LONG_TAIL_PROPS: ReadonlySet<string> = new Set([
  'blockSize',
  'inlineSize',
  'maxBlockSize',
  'maxInlineSize',
  'minBlockSize',
  'minInlineSize',
])

/**
 * The spacing utility table (`utility`, Tamagui shorthand prop, RN longhand
 * prop) `spacingClasses` walks — pure data, housed here with the other
 * long-tail tables for the `max-lines` cap on `style-classes.ts`.
 */
export const SPACING_UTILITIES = [
  ['m', 'm', 'margin'],
  ['mx', 'mx', 'marginHorizontal'],
  ['my', 'my', 'marginVertical'],
  ['mt', 'mt', 'marginTop'],
  ['mb', 'mb', 'marginBottom'],
  ['ml', 'ml', 'marginLeft'],
  ['mr', 'mr', 'marginRight'],
  ['p', 'p', 'padding'],
  ['px', 'px', 'paddingHorizontal'],
  ['py', 'py', 'paddingVertical'],
  ['pt', 'pt', 'paddingTop'],
  ['pb', 'pb', 'paddingBottom'],
  ['pl', 'pl', 'paddingLeft'],
  ['pr', 'pr', 'paddingRight'],
] as const

/**
 * The React-Native-only `pointerEvents` values, mapped the way legacy Tamagui
 * web polyfills them (@tamagui/web `getCSSStylesAtomic`): the element rule
 * plus a `>*` direct-children rule. Passing them through as CSS values —
 * `box-none` is not a CSS `pointer-events` value — makes the browser drop the
 * declaration, so a converted overlay silently BLOCKS the clicks it was meant
 * to pass through (INFRA-3490). Legacy marks both rules `!important`; the
 * compat lane drops that like it already does for `none`/`auto` (parity
 * normalizes priority away, and no compat class competes on the children).
 * `none`/`auto` keep the generic long-tail path (`longTailClasses`).
 */
export const POINTER_EVENTS_BOX_CLASSES: Readonly<Record<string, readonly string[]>> = {
  'box-none': ['[pointer-events:none]', '[&>*]:[pointer-events:auto]'],
  'box-only': ['[pointer-events:auto]', '[&>*]:[pointer-events:none]'],
}

/** Convert a camelCase style prop to its CSS property name. */
export function cssPropertyName(prop: string): string {
  return CSS_PROP_NAME_OVERRIDES[prop] ?? prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}
