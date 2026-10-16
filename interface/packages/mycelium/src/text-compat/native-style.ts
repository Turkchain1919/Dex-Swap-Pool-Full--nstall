/**
 * Text binding of the compat native style lane (INFRA-3229): the shared
 * layout surface plus Text-specific typography.
 *
 * - Variant metrics resolve to no literal class, so without this lane native
 *   Text would render at RN's default 14px.
 * - `--stext-*` theme color vars aren't in the native bundle; colors stay on
 *   the className (pinned gap, not patched here).
 */
import { type CompatNativeStyleResult, compatLayoutNativeStyle, type MutableNativeStyle } from '../compat/native-style'
import { isCompatLayoutStyleProp } from '../compat/native-style-membership'
import { isSemanticColorToken } from '../compat/native-values'
import { type TamaguiVariable, unwrapVariable } from '../compat/tokens'
import { globalFontToken } from './compile'
import {
  NATIVE_BOOK_WEIGHT,
  NATIVE_MEDIUM_WEIGHT,
  type NativeFontFamilyKey,
  nativeFamilyForFontToken,
  nativePlatformFont,
  nativeVariantFont,
  nativeVariantMetric,
  resolveNativeFontMetric,
} from './native-font'
import { nativeFontEnvironment } from './native-font-environment'
import type { TextCompatProps } from './props'
import { LONG_TAIL_STYLE_PROPS } from './style-props'
import { FONT_DEFINITIONS, THEME_COLOR_TOKENS } from './theme-tokens.generated'
import { FONT_WEIGHT_TOKEN, lookupToken } from './tokens'
import { fontWeightWinsOverVariant } from './typography-classes'

const THEME_COLOR_TOKEN_SET: ReadonlySet<string> = new Set(THEME_COLOR_TOKENS)

/** A Text color the className lane owns (a pinned `--stext-*` var), with or without `$`. */
function isTextThemeColor(value: string): boolean {
  const name = value.startsWith('$') ? value.slice(1) : value
  return THEME_COLOR_TOKEN_SET.has(name) || isSemanticColorToken(value)
}

// Fraction spelled as a top-level alternative rather than `\d+(?:\.\d+)?`: the
// nested quantifier trips `security(detect-unsafe-regex)`'s star-height check.
const PX_STRING = /^(-?\d+\.\d+|-?\d+)px$/

/** RN honours exactly these `userSelect` values. */
const RN_USER_SELECT: ReadonlySet<string> = new Set(['auto', 'text', 'none', 'contain', 'all'])

/**
 * RN's accepted literal `fontWeight` values. The app's 485/535 tokens are
 * deliberately excluded — those select a Basel font FILE instead of a literal
 * weight (INFRA-3461/INFRA-3453); their numeric spellings pass through via
 * `APP_NUMERIC_FONT_WEIGHTS` below.
 */
const RN_FONT_WEIGHTS: ReadonlySet<string> = new Set([
  'normal',
  'bold',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
])

/**
 * Numeric spellings of the app's web weights (485/535). Legacy Tamagui passes
 * these through raw with the variant's font untouched (measured), so this
 * lane does too — only the token spellings select a face (above).
 */
const APP_NUMERIC_FONT_WEIGHTS: ReadonlySet<string> = new Set(Object.values(FONT_WEIGHT_TOKEN).map(String))

function nativeFontMetric({
  value: raw,
  fontToken,
  kind,
  smallFont,
}: {
  value: number | string | TamaguiVariable
  fontToken: string
  kind: 'sizes' | 'lineHeights'
  smallFont: boolean
}): number | undefined {
  const value = unwrapVariable(raw)
  if (typeof value === 'number') {
    return value
  }
  if (value.startsWith('$')) {
    // NATIVE tables, not the web ones the className lane compiles: sizes are
    // +1px on native (adjustedSize) — see native-font.ts.
    return resolveNativeFontMetric({ value, fontToken, kind, smallFont })
  }
  const px = PX_STRING.exec(value)
  return px === null ? undefined : Number(px[1])
}

/**
 * A `$`-token `letterSpacing` has no correct native value, so it's dropped
 * and dev-warned rather than resolved — matches the class lane, which is
 * inert-to-crashing for this case too (escalated separately; not fixable
 * here). Numbers and px strings are real RN values and still land.
 */
function nativeLetterSpacing(value: number | string): number | undefined {
  if (typeof value === 'number') {
    return value
  }
  const px = PX_STRING.exec(value)
  return px === null ? undefined : Number(px[1])
}

interface ApplyArgs {
  props: TextCompatProps
  style: MutableNativeStyle
  dropped: string[]
}

/**
 * Variant typography, then explicit props override it — same precedence as
 * the class lane.
 *
 * Fonts deliberately diverge from the className lane (INFRA-3461): the
 * variant's family/weight utilities carry the WEB ramp, absent natively, so
 * this lane resolves the platform font itself instead (mirrors legacy
 * Tamagui; see native-font.ts). Their literals are deliberately not spelled
 * here since this file sits in the scanned `@source` tree.
 */
function applyFontMetrics({ props, style, dropped }: ApplyArgs): void {
  // Same per-element font context as the className lane, so `$md={{variant}}`
  // re-keys both alike.
  const fontToken = globalFontToken(props)
  const { platform, smallFont } = nativeFontEnvironment()
  // undefined means "no font in play" — a pool with no typography must emit
  // no font keys.
  let family: NativeFontFamilyKey | undefined
  let weight: string | number | undefined
  if (props.variant !== undefined) {
    const variantFont = nativeVariantFont({ variant: props.variant, smallFont })
    family = variantFont.family
    weight = variantFont.fontWeight
    style['fontSize'] = nativeVariantMetric({ variant: props.variant, fontToken, kind: 'sizes', smallFont })
    if (props.lineHeight !== 'unset') {
      style['lineHeight'] = nativeVariantMetric({ variant: props.variant, fontToken, kind: 'lineHeights', smallFont })
    }
  }
  if (props.fontSize !== undefined) {
    const resolved = nativeFontMetric({ value: props.fontSize, fontToken, kind: 'sizes', smallFont })
    if (resolved === undefined) {
      dropped.push('fontSize')
    } else {
      style['fontSize'] = resolved
    }
  }
  if (props.lineHeight !== undefined && props.lineHeight !== 'unset') {
    const resolved = nativeFontMetric({ value: props.lineHeight, fontToken, kind: 'lineHeights', smallFont })
    if (resolved === undefined) {
      dropped.push('lineHeight')
    } else {
      style['lineHeight'] = resolved
    }
  }
  // Same insertion-ordered winner rule as the className lane (INFRA-3457):
  // both must agree on whether fontWeight or the variant wins.
  if (props.fontWeight !== undefined && fontWeightWinsOverVariant(props)) {
    const resolvedWeight = unwrapVariable(props.fontWeight)
    const raw = String(resolvedWeight)
    const token = lookupToken(FONT_WEIGHT_TOKEN, raw.startsWith('$') ? raw.slice(1) : raw)
    if (token !== undefined) {
      // 485/535 tokens select the Basel FACE (INFRA-3453), like legacy
      // Tamagui — anchored to the font context when no variant named one.
      weight = token === FONT_WEIGHT_TOKEN.medium ? NATIVE_MEDIUM_WEIGHT : NATIVE_BOOK_WEIGHT
      family ??= nativeFamilyForFontToken(fontToken)
    } else if (RN_FONT_WEIGHTS.has(raw) || APP_NUMERIC_FONT_WEIGHTS.has(raw)) {
      // Numeric in, numeric out — must read the same as the class lane.
      weight = typeof resolvedWeight === 'number' ? resolvedWeight : raw
      style['fontWeight'] = weight
    } else {
      dropped.push('fontWeight')
    }
  }
  if (props.fontFamily !== undefined) {
    const resolvedFamily = String(unwrapVariable(props.fontFamily))
    if (resolvedFamily.startsWith('$')) {
      const name = resolvedFamily.slice(1)
      if (name in FONT_DEFINITIONS) {
        family = nativeFamilyForFontToken(name)
      } else {
        dropped.push('fontFamily')
      }
    } else {
      // A raw family name opts out of the platform mapping; a ramp weight
      // still lands below.
      style['fontFamily'] = resolvedFamily
      family = undefined
    }
  }
  if (family !== undefined) {
    const platformFont = nativePlatformFont({ family, weight, platform })
    style['fontFamily'] = platformFont.fontFamily
    if (platformFont.fontWeight !== undefined) {
      style['fontWeight'] = platformFont.fontWeight
    }
  } else if (weight !== undefined) {
    style['fontWeight'] = weight
  }
  if (props.fontStyle === 'italic' || props.fontStyle === 'normal') {
    style['fontStyle'] = props.fontStyle
  }
  if (props.letterSpacing !== undefined) {
    const resolved = nativeLetterSpacing(props.letterSpacing)
    if (resolved === undefined) {
      dropped.push('letterSpacing')
    } else {
      style['letterSpacing'] = resolved
    }
  }
}

/** Colors, selection affordances and text shadow. */
function applyTextAppearance({ props, style }: ApplyArgs): void {
  const color = props.color === undefined ? undefined : String(unwrapVariable(props.color))
  if (color !== undefined && !isTextThemeColor(color)) {
    style['color'] = color
  }
  const textDecorationColor =
    props.textDecorationColor === undefined ? undefined : String(unwrapVariable(props.textDecorationColor))
  if (textDecorationColor !== undefined && !isTextThemeColor(textDecorationColor)) {
    style['textDecorationColor'] = textDecorationColor
  }
  // Text curates `userSelect` and `cursor` out of its long tail into the
  // typography compiler; both are real RN style keys.
  if (props.userSelect !== undefined && RN_USER_SELECT.has(props.userSelect)) {
    style['userSelect'] = props.userSelect
  }
  if (props.cursor !== undefined) {
    style['cursor'] = props.cursor
  }
  if (
    props.textShadowColor !== undefined ||
    props.textShadowOffset !== undefined ||
    props.textShadowRadius !== undefined
  ) {
    // The class lane composes `<x>px <y>px <radius>px <color>` with `#000000`
    // when no color is given; a THEME token resolves to a `--stext-*` var that
    // has no native counterpart, so it stays on the className (pinned gap).
    if (props.textShadowColor === undefined) {
      style['textShadowColor'] = '#000000'
    } else {
      const textShadowColor = String(unwrapVariable(props.textShadowColor))
      if (!isTextThemeColor(textShadowColor)) {
        style['textShadowColor'] = textShadowColor
      }
    }
    style['textShadowOffset'] = props.textShadowOffset ?? { width: 0, height: 0 }
    style['textShadowRadius'] = props.textShadowRadius ?? 0
  }
}

/**
 * RN-only TextStyle keys with no class lane on any platform. Legacy Tamagui
 * lands them raw from a `$platform-native` pool, so this lane does too.
 * Curated: extend when a call site needs another key.
 */
const RN_ONLY_POOL_STYLE_KEYS = ['includeFontPadding', 'textAlignVertical'] as const

/**
 * Keys that no-op on `style` for a theme-token value without recording a drop
 * (color/textDecorationColor/textShadowColor here; backgroundColor/borderColor
 * from the shared layout surface). Needed so a pool value through one of
 * these isn't both silently dropped AND swept past the blanket
 * `$platform-native` warning as "handled".
 */
const POOL_THEME_COLOR_KEYS = [
  'color',
  'textDecorationColor',
  'textShadowColor',
  'backgroundColor',
  'borderColor',
] as const

/**
 * Every prop name the Text style lane reads, on top of the shared layout
 * surface and the two RN-only pool keys — used by `isPoolStyleLaneKey` to
 * tell whether a pool key has any style-lane expression at all (e.g.
 * `textAlign` has none; it only ever compiles to a class).
 */
const TEXT_ONLY_STYLE_LANE_PROP_SET: ReadonlySet<string> = new Set<string>([
  'variant',
  'fontSize',
  'lineHeight',
  'fontWeight',
  'fontFamily',
  'fontStyle',
  'letterSpacing',
  'userSelect',
  'cursor',
  'textShadowOffset',
  'textShadowRadius',
  ...POOL_THEME_COLOR_KEYS,
  ...RN_ONLY_POOL_STYLE_KEYS,
])

/** Whether the Text style lane consults `key` at all (see the two prop sets above). */
function isPoolStyleLaneKey(key: string): boolean {
  return TEXT_ONLY_STYLE_LANE_PROP_SET.has(key) || isCompatLayoutStyleProp(key)
}

/**
 * Applies what a props-level merge alone can't express: the RN-only pool
 * keys with no base surface, the theme-color drop-and-warn (a pool has no
 * className to fall back to), and re-labelling drops the pool itself declared
 * as `$platform-native.x` (its value always wins for a key it declares, so
 * the drop is attributable to it, never the base).
 */
function applyPlatformNativePoolExtras({
  pool,
  style,
  dropped,
}: {
  pool: TextCompatProps
  style: MutableNativeStyle
  dropped: readonly string[]
}): string[] {
  const raw = pool as Record<string, unknown>
  for (const key of RN_ONLY_POOL_STYLE_KEYS) {
    if (raw[key] !== undefined) {
      style[key] = raw[key]
    }
  }
  const poolDropped: string[] = []
  for (const key of POOL_THEME_COLOR_KEYS) {
    // `style[key]` left undefined despite the pool naming it IS the
    // theme-token signal, already decided by the merged compile.
    if (style[key] === undefined && raw[key] !== undefined) {
      poolDropped.push(key)
    }
  }
  const poolOwned = new Set(Object.keys(raw).filter((key) => raw[key] !== undefined))
  return [
    ...dropped.map((key) => (poolOwned.has(key) ? `$platform-native.${key}` : key)),
    ...poolDropped.map((key) => `$platform-native.${key}`),
  ]
}

/** The full leg-side RN style object for a TextCompat props object. */
export function textNativeStyle(props: TextCompatProps): CompatNativeStyleResult {
  const pool = props['$platform-native'] as TextCompatProps | undefined
  // Merge the pool over base props at the PROPS level, then compile ONCE —
  // never two independent compiles patched together. Needed for composite
  // keys built from several props (transform, text-shadow, the border-color
  // default): compiling the pool alone would treat "other keys absent" as
  // license to fall back to a default, clobbering a base value it should
  // combine with instead.
  // An explicit `undefined` pool value means "pool doesn't touch this key",
  // not "erase the base" — filter those out before spreading, since an own
  // key set to `undefined` would otherwise still win over the base's.
  const definedPool =
    pool === undefined
      ? undefined
      : (Object.fromEntries(Object.entries(pool).filter(([, value]) => value !== undefined)) as TextCompatProps)
  const mergedProps: TextCompatProps = definedPool === undefined ? props : { ...props, ...definedPool }
  const { style, dropped: compiled } = compatLayoutNativeStyle(mergedProps, { longTailProps: LONG_TAIL_STYLE_PROPS })
  const mutable = style as MutableNativeStyle
  applyFontMetrics({ props: mergedProps, style: mutable, dropped: compiled })
  applyTextAppearance({ props: mergedProps, style: mutable, dropped: compiled })
  const dropped =
    pool === undefined ? compiled : applyPlatformNativePoolExtras({ pool, style: mutable, dropped: compiled })
  // `$platform-native` is flagged dead elsewhere, but this lane applies it —
  // suppress that warning only when every pool key is one the style lane
  // actually reads; a className-only key (e.g. `textAlign`) still needs it.
  const poolFullyOwned =
    pool === undefined ||
    Object.keys(pool as Record<string, unknown>)
      .filter((key) => (pool as Record<string, unknown>)[key] !== undefined)
      .every((key) => isPoolStyleLaneKey(key))
  return { style, dropped: poolFullyOwned ? dropped.filter((key) => key !== '$platform-native') : dropped }
}

/**
 * TextCompat's `BASE_CLASSES` opens with `[display:inline]`, which uniwind
 * resolves to `display: "flow"` on native (measured) — an invalid RN value on
 * EVERY native Text — and `numberOfLines > 1` adds `[display:-webkit-box]`. The
 * compiler output stays byte-identical; the leg drops any token declaring a
 * `display` outside `RN_DISPLAY_VALUES` from the string it attaches. The
 * filter itself is the shared, variant-prefix-aware compat gate — a
 * pool-scoped `$theme-dark={{ display: 'grid' }}` compiles to a PREFIXED
 * `dark:[display:grid]` token an anchored match here used to miss.
 */
export { stripNonNativeDisplayClasses } from '../compat/native-display'
