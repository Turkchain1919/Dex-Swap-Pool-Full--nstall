/**
 * The documented-rejected half of the compat LONG-TAIL token boundary
 * (INFRA-3339).
 *
 * The supported half lives in `style-props.ts`: the four token-family sets
 * (`RADIUS_LONG_TAIL_PROPS`, `COLOR_LONG_TAIL_PROPS`, `SPACE_LONG_TAIL_PROPS`,
 * `SIZE_LONG_TAIL_PROPS`) whose `$` tokens the long-tail compilers resolve
 * exactly like their shorthands. Every OTHER long-tail prop is listed HERE
 * with the reason a `$` token on it stays a hard compile error (web) /
 * drop-and-warn (native), and `long-tail-token-coverage.test.ts` pins
 * supported ∪ rejected = the long-tail prop tables EXACTLY — the universe is
 * DERIVED from the live tables (the shared `LONG_TAIL_STYLE_PROPS` plus
 * Text's extras), not hand-transcribed, so a new long-tail prop fails the
 * gate until someone makes an explicit boundary decision for it.
 *
 * The split is adjudicated against Tamagui's own `tokenCategories`
 * (@tamagui/helpers `validStyleProps`), not against memory: a prop in a
 * declared category (radius/color/size — and the `SpaceKeys`-typed logical
 * longhands) is a supported family; a prop legacy resolves only through the
 * implicit space-token FALLBACK (propMapper falls back to `tokens.space` for
 * ANY uncategorized key) is rejected here, because that fallback is a legacy
 * quirk rather than a typed contract.
 *
 * Physical per-side border widths (`borderTopWidth` etc.) are not in this
 * census at all: they are not long-tail props — they resolve on the shorthand
 * lane (`visualClasses` via `borderWidthPx`), and the conversion codemod
 * rewrites their numeric-only legacy spellings. `TOKEN_PROPS_HANDLED_ON_SHORTHAND_LANE`
 * records that, and the test pins them out of the long-tail tables.
 */

/**
 * No declared Tamagui token category: enum/string/CSS pass-through surfaces
 * (legacy resolves a `$` here only via the untyped space fallback, or via the
 * theme-value fallback that resolves color tokens on ANY key — neither is a
 * typed contract worth mirroring). Values pass through verbatim; `$` tokens
 * throw on web and drop-and-warn on native.
 */
const NO_TOKEN_CATEGORY = [
  'no declared Tamagui token category (enum/string/CSS pass-through surface); legacy resolves a $ value here',
  'only via the untyped space/theme fallbacks, which are quirks rather than typed contracts — tokens stay a',
  'compile error on web and drop-and-warn on native; widen on demand with a family decision.',
].join(' ')

/**
 * CSS-only logical longhand whose legacy resolution exists ONLY through
 * Tamagui's implicit space-token fallback (`propMapper` resolves
 * `tokens.space[value]` for any key no category claims). Not `SpaceKeys`-typed,
 * zero measured frontier usage with tokens — rejected until a call site needs
 * it, at which point it is one set-membership away from the space family.
 */
const SPACE_FALLBACK_ONLY = [
  "legacy resolves tokens here only through Tamagui's implicit space-token fallback (any uncategorized key",
  'falls back to tokens.space), not a SpaceKeys-typed contract; no measured frontier usage — one',
  'SPACE_LONG_TAIL_PROPS membership away from support when a real call site needs it.',
].join(' ')

/**
 * CSS animation longhands (INFRA-3330): values pass through verbatim and are
 * additionally gated by `assertAnimationValue` (style-props.ts) —
 * theme tokens and `var()` references throw, because transitions/animations
 * stay scoped to NON-COLOR properties (the theme-flip flash rule), and bare
 * numbers on the time-valued props throw (a px suffix is not a valid CSS
 * time); no token family may ever claim these props.
 */
const ANIMATION_NON_COLOR = [
  'CSS animation longhand: values pass through verbatim, additionally gated by assertAnimationValue',
  '(style-props.ts) — theme tokens and var() references throw, because animations stay scoped to NON-COLOR',
  'properties; a token family must never claim these props.',
].join(' ')

/**
 * Every long-tail style prop (shared table + Text extras) whose `$` tokens the
 * compat compilers reject, with the reason. Keys are prop names as a call site
 * spells them.
 */
export const REJECTED_LONG_TAIL_TOKEN_PROPS: Readonly<Record<string, string>> = {
  WebkitBoxOrient: NO_TOKEN_CATEGORY,
  WebkitLineClamp: NO_TOKEN_CATEGORY,
  WebkitMaskImage: NO_TOKEN_CATEGORY,
  alignContent: NO_TOKEN_CATEGORY,
  animationDelay: ANIMATION_NON_COLOR,
  animationDirection: ANIMATION_NON_COLOR,
  animationDuration: ANIMATION_NON_COLOR,
  animationFillMode: ANIMATION_NON_COLOR,
  animationIterationCount: ANIMATION_NON_COLOR,
  animationName: ANIMATION_NON_COLOR,
  animationPlayState: ANIMATION_NON_COLOR,
  animationTimingFunction: ANIMATION_NON_COLOR,
  aspectRatio: NO_TOKEN_CATEGORY,
  backdropFilter: NO_TOKEN_CATEGORY,
  backfaceVisibility: NO_TOKEN_CATEGORY,
  // `background` moved to `COLOR_LONG_TAIL_PROPS` (INFRA-3750 sibling,
  // style-props.ts): its color sub-value is `background-color`, and a real
  // call site (web PasskeyMenu.tsx) sets a theme token through it.
  backgroundAttachment: NO_TOKEN_CATEGORY,
  backgroundBlendMode: NO_TOKEN_CATEGORY,
  backgroundClip: NO_TOKEN_CATEGORY,
  backgroundImage: NO_TOKEN_CATEGORY,
  backgroundOrigin: NO_TOKEN_CATEGORY,
  backgroundPosition: NO_TOKEN_CATEGORY,
  backgroundRepeat: NO_TOKEN_CATEGORY,
  backgroundSize: NO_TOKEN_CATEGORY,
  borderBlockEndStyle: NO_TOKEN_CATEGORY,
  borderBlockEndWidth: SPACE_FALLBACK_ONLY,
  borderBlockStartStyle: NO_TOKEN_CATEGORY,
  borderBlockStartWidth: SPACE_FALLBACK_ONLY,
  borderBlockStyle: NO_TOKEN_CATEGORY,
  borderBlockWidth: SPACE_FALLBACK_ONLY,
  borderCurve: NO_TOKEN_CATEGORY,
  borderImage: NO_TOKEN_CATEGORY,
  borderInlineEndStyle: NO_TOKEN_CATEGORY,
  borderInlineEndWidth: SPACE_FALLBACK_ONLY,
  borderInlineStartStyle: NO_TOKEN_CATEGORY,
  borderInlineStartWidth: SPACE_FALLBACK_ONLY,
  borderInlineStyle: NO_TOKEN_CATEGORY,
  borderInlineWidth: SPACE_FALLBACK_ONLY,
  borderStyle: NO_TOKEN_CATEGORY,
  boxSizing: NO_TOKEN_CATEGORY,
  clipPath: NO_TOKEN_CATEGORY,
  contain: NO_TOKEN_CATEGORY,
  containerType: NO_TOKEN_CATEGORY,
  content: NO_TOKEN_CATEGORY,
  cursor: NO_TOKEN_CATEGORY,
  direction: NO_TOKEN_CATEGORY,
  filter: NO_TOKEN_CATEGORY,
  float: NO_TOKEN_CATEGORY,
  fontVariant: NO_TOKEN_CATEGORY,
  gridColumn: NO_TOKEN_CATEGORY,
  gridColumnEnd: NO_TOKEN_CATEGORY,
  gridColumnGap: SPACE_FALLBACK_ONLY,
  gridColumnStart: NO_TOKEN_CATEGORY,
  gridRow: NO_TOKEN_CATEGORY,
  gridRowEnd: NO_TOKEN_CATEGORY,
  gridRowGap: SPACE_FALLBACK_ONLY,
  gridRowStart: NO_TOKEN_CATEGORY,
  gridTemplateAreas: NO_TOKEN_CATEGORY,
  gridTemplateColumns: NO_TOKEN_CATEGORY,
  insetBlock: SPACE_FALLBACK_ONLY,
  insetBlockEnd: SPACE_FALLBACK_ONLY,
  insetBlockStart: SPACE_FALLBACK_ONLY,
  insetInline: SPACE_FALLBACK_ONLY,
  insetInlineEnd: SPACE_FALLBACK_ONLY,
  insetInlineStart: SPACE_FALLBACK_ONLY,
  isolation: NO_TOKEN_CATEGORY,
  marginBlock: SPACE_FALLBACK_ONLY,
  marginBlockEnd: SPACE_FALLBACK_ONLY,
  marginBlockStart: SPACE_FALLBACK_ONLY,
  marginInline: SPACE_FALLBACK_ONLY,
  marginInlineEnd: SPACE_FALLBACK_ONLY,
  marginInlineStart: SPACE_FALLBACK_ONLY,
  mask: NO_TOKEN_CATEGORY,
  maskBorder: NO_TOKEN_CATEGORY,
  maskBorderMode: NO_TOKEN_CATEGORY,
  maskBorderOutset: NO_TOKEN_CATEGORY,
  maskBorderRepeat: NO_TOKEN_CATEGORY,
  maskBorderSlice: NO_TOKEN_CATEGORY,
  maskBorderSource: NO_TOKEN_CATEGORY,
  maskBorderWidth: NO_TOKEN_CATEGORY,
  maskClip: NO_TOKEN_CATEGORY,
  maskComposite: NO_TOKEN_CATEGORY,
  maskImage: NO_TOKEN_CATEGORY,
  maskMode: NO_TOKEN_CATEGORY,
  maskOrigin: NO_TOKEN_CATEGORY,
  maskPosition: NO_TOKEN_CATEGORY,
  maskRepeat: NO_TOKEN_CATEGORY,
  maskSize: NO_TOKEN_CATEGORY,
  maskType: NO_TOKEN_CATEGORY,
  mixBlendMode: NO_TOKEN_CATEGORY,
  objectFit: NO_TOKEN_CATEGORY,
  outlineStyle: NO_TOKEN_CATEGORY,
  overflowBlock: NO_TOKEN_CATEGORY,
  overflowInline: NO_TOKEN_CATEGORY,
  overflowWrap: NO_TOKEN_CATEGORY,
  overflowX: NO_TOKEN_CATEGORY,
  overflowY: NO_TOKEN_CATEGORY,
  overscrollBehavior: NO_TOKEN_CATEGORY,
  overscrollBehaviorX: NO_TOKEN_CATEGORY,
  overscrollBehaviorY: NO_TOKEN_CATEGORY,
  paddingBlock: SPACE_FALLBACK_ONLY,
  paddingBlockEnd: SPACE_FALLBACK_ONLY,
  paddingBlockStart: SPACE_FALLBACK_ONLY,
  paddingInline: SPACE_FALLBACK_ONLY,
  paddingInlineEnd: SPACE_FALLBACK_ONLY,
  paddingInlineStart: SPACE_FALLBACK_ONLY,
  pointerEvents: NO_TOKEN_CATEGORY,
  scrollbarWidth: NO_TOKEN_CATEGORY,
  textDecoration: NO_TOKEN_CATEGORY,
  textDecorationStyle: NO_TOKEN_CATEGORY,
  textEmphasis: NO_TOKEN_CATEGORY,
  textWrap: NO_TOKEN_CATEGORY,
  touchAction: NO_TOKEN_CATEGORY,
  transformStyle: NO_TOKEN_CATEGORY,
  transition: NO_TOKEN_CATEGORY,
  userSelect: NO_TOKEN_CATEGORY,
  verticalAlign: NO_TOKEN_CATEGORY,
}

/**
 * Token-valued longhands that are NOT long-tail props at all: their tokens
 * already resolve on the shorthand lane, and the census test pins that they
 * stay out of the long-tail tables (landing there would silently re-open the
 * hole this boundary closes).
 */
const PER_SIDE_BORDER_WIDTH_REASON = [
  'WEB: resolved in visualClasses via borderWidthPx; numeric-only legacy spellings are codemod-rewritten.',
  'NATIVE: applyBorders passes the value through RAW (no token resolution), so a $ token would land as a',
  "literal string in the RN style object — the one shorthand-lane surface the native raw-$ invariant's gate",
  '(which iterates NATIVE_LONG_TAIL_PROPS only) does not cover. Tracked by INFRA-3272.',
].join(' ')

export const TOKEN_PROPS_HANDLED_ON_SHORTHAND_LANE: Readonly<Record<string, string>> = {
  borderTopWidth: PER_SIDE_BORDER_WIDTH_REASON,
  borderBottomWidth: PER_SIDE_BORDER_WIDTH_REASON,
  borderLeftWidth: PER_SIDE_BORDER_WIDTH_REASON,
  borderRightWidth: PER_SIDE_BORDER_WIDTH_REASON,
}
