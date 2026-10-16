/**
 * The compat VALUE contract for token-categorised props: the curated closed-set
 * type legs (Spore tokens + the non-token legacy family — INFRA-3232/3258) and
 * their runtime resolvers, shared by every compat compiler. The types and the
 * runtime twin live together so the admitted family cannot drift from what the
 * lanes actually emit.
 */
// Type-only — never a runtime react-native import in a file shared by both platform legs (packages/mycelium/CLAUDE.md).
import type { OpaqueColorValue } from 'react-native'
import {
  arbitrary,
  lookupToken,
  SPACE_TOKEN_PX,
  type SporeColorToken,
  type SporeRadiusToken,
  type SporeSpaceToken,
  type SporeZIndexToken,
  type TamaguiVariable,
  unwrapVariable,
  Z_INDEX_TOKEN,
} from './tokens'

/**
 * The universal non-token leg Tamagui attaches to EVERY token-categorised prop
 * (`WebStyleValueUniversal`), radius and zIndex included: the CSS-wide
 * keywords plus custom-property reads. Curated closed set — INFRA-3258.
 */
export type CssUniversalValue = 'unset' | 'inherit' | `var(${string})`

/**
 * Absolute and font-relative CSS lengths. Kept OUT of the `%`/viewport leg
 * above because those are a loose suffix match, while these must carry a
 * numeric prefix: `thin` is a legal `border-width` keyword and ends in `in`, so
 * a bare suffix test would admit it on `padding` too.
 *
 * These belong here because the NUMERIC leg already emits exactly the same
 * output: `spaceTokenPx(1)` is `1px`, so admitting the string `'1px'` closes an
 * inconsistency between the number and string legs rather than adding
 * behaviour. Deliberately NOT reachable from `ZIndexValue`, which is built on
 * `CssUniversalValue` alone: `z-index` takes an integer, so a length there
 * would be a nonsense value rather than a missing one.
 */
export type CssAbsoluteLengthValue = `${number}${(typeof CSS_ABSOLUTE_LENGTH_UNITS)[number]}`

/**
 * The web length family Tamagui admits in space/size token positions
 * (`WebOnlySizeValue` + the `somewhat-strict-web` percentage leg): percentages,
 * viewport units (dynamic/small/large variants and vmin/vmax included), the
 * CSS math functions, and the content-sizing keywords. Template-literal
 * closed set, never `string` — the runtime twin is `isCssLengthPassthroughValue`
 * (`isCssPassthroughValue` is the narrower one, and rejects the length leg below).
 */
export type CssLengthValue =
  // Not `${number}%`: Tamagui's own percent leg is `${string}%` (PercentString), so tighter fails the family sweep.
  | `${string}%`
  | CssAbsoluteLengthValue
  | `${number}vw`
  | `${number}svw`
  | `${number}lvw`
  | `${number}dvw`
  | `${number}vh`
  | `${number}svh`
  | `${number}lvh`
  | `${number}dvh`
  | `${number}vmin`
  | `${number}vmax`
  | `calc(${string})`
  | `min(${string})`
  | `max(${string})`
  | 'max-content'
  | 'min-content'

/** The full non-token legacy value family on space-categorised props (INFRA-3258). */
export type CssPassthroughValue = 'auto' | CssLengthValue | CssUniversalValue

/**
 * Spore space token, raw pixel number, or the non-token legacy family
 * (percentages, `auto`, calc()/var(), …). `null` is admitted alongside
 * `undefined` (INFRA-3821) — legacy Tamagui's declared space-prop types do,
 * and at least one real call site passes it through conditionally
 * (`FlexProps['p']`); every resolver that reads a `SpaceValue` prop treats
 * `null` the same as "not set".
 */
export type SpaceValue = SporeSpaceToken | number | CssPassthroughValue | TamaguiVariable | null
/**
 * Spore color token, any raw CSS color (`#131313`, `rgba(0,0,0,0.5)`, …), a
 * runtime Variable, or legacy Tamagui's `OpaqueColorValue` (the branded return
 * of RN's `PlatformColor()`/`DynamicColor()` — INFRA-3804). Admitted for
 * structural compatibility with legacy `FlexProps`/`TextProps`-typed
 * boundaries; no real call site passes one today, and `resolveColorOrWarn`
 * (tokens.ts) is the runtime drop policy for if one ever does.
 */
export type ColorValue = SporeColorToken | (string & {}) | TamaguiVariable | OpaqueColorValue
/**
 * Border widths, shadow geometry and the px-valued transforms. Tamagui lists
 * every `border*Width` in `SpaceKeys`, so the legacy props accept the full
 * `$space` token set (`borderWidth="$spacing1"`, 305 live call sites —
 * INFRA-3232) plus the non-token space family (INFRA-3258).
 */
export type BorderWidthValue = SporeSpaceToken | number | CssPassthroughValue | TamaguiVariable
/**
 * `zIndex` is a Tamagui `ZIndexKey`: the `$zIndex` tokens, a raw layer number,
 * and the universal non-token leg (Tamagui gives zIndex no length family).
 */
export type ZIndexValue = SporeZIndexToken | number | CssUniversalValue | TamaguiVariable
/**
 * `borderRadius` is a Tamagui `RadiusKey`: the `$radius` tokens, raw px, and
 * the universal non-token leg (Tamagui gives radius no length family).
 */
export type RadiusValue = SporeRadiusToken | number | CssUniversalValue | TamaguiVariable
/** Numbers are pixels; strings pass through (`'100%'`, `'auto'`, `'max-content'`); Variables unwrap. */
export type SizeValue = number | string | TamaguiVariable

const CSS_PASSTHROUGH_KEYWORDS: ReadonlySet<string> = new Set([
  'auto',
  'unset',
  'inherit',
  'max-content',
  'min-content',
])
const CSS_FUNCTION_VALUE = /^(?:calc|min|max|var)\(/
const CSS_LENGTH_UNIT_SUFFIX = /(?:%|v[wh]|vmin|vmax)$/

/**
 * The runtime twin of the `CssPassthroughValue` type leg: the curated
 * non-token string family the space/width/radius/zIndex lanes emit verbatim
 * instead of resolving (INFRA-3258). `$` tokens are checked before this at
 * every call site, so a typo'd token still throws loudly.
 */
export function isCssPassthroughValue(value: string): boolean {
  return CSS_PASSTHROUGH_KEYWORDS.has(value) || CSS_FUNCTION_VALUE.test(value) || CSS_LENGTH_UNIT_SUFFIX.test(value)
}

/**
 * CSS `<number>`, checked in three cheap steps rather than one regex. The
 * natural `^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$` trips
 * `detect-unsafe-regex` (measured, not assumed), so:
 *  - the character shape excludes what CSS has no syntax for. This is the half
 *    that matters: `Number('0x10')` is `16`, so a bare `Number()` check let
 *    `0x10px` through and emitted the dead class `p-[0x10px]`. Same for
 *    `0b`/`0o` and `Infinity`.
 *  - a dot must be followed by a digit, so `1.` is not a length.
 *  - `Number()` then rejects what is still malformed (`1.2.3`, `1e`, `1+2`).
 * Scientific notation is deliberately kept: `1e3px` is a legal CSS length.
 */
const CSS_NUMBER_CHARS = /^[+-]?[.\d][\d.eE+-]*$/
const CSS_NUMBER_DOT_WITHOUT_DIGIT = /\.(?!\d)/

function isCssNumber(value: string): boolean {
  return CSS_NUMBER_CHARS.test(value) && !CSS_NUMBER_DOT_WITHOUT_DIGIT.test(value) && Number.isFinite(Number(value))
}

const CSS_ABSOLUTE_LENGTH_UNITS = [
  'px',
  'rem',
  'em',
  'ex',
  'ch',
  'cap',
  'ic',
  'lh',
  'rlh',
  'cm',
  'mm',
  'Q',
  'in',
  'pt',
  'pc',
] as const

/**
 * Runtime twin of `CssAbsoluteLengthValue`: a numeric prefix plus a length
 * unit. Requires the numeric prefix on purpose, unlike the loose
 * `CSS_LENGTH_UNIT_SUFFIX` above, so a keyword that happens to end in a unit
 * (`thin` ends in `in`) is not admitted as a length.
 *
 * Every unit is tried rather than the first match, because `rem` also ends with
 * `em` and a first-match test would read `0.5rem` as the prefix `0.5r` and
 * reject it.
 */
function isCssAbsoluteLength(value: string): boolean {
  return CSS_ABSOLUTE_LENGTH_UNITS.some((unit) => value.endsWith(unit) && isCssNumber(value.slice(0, -unit.length)))
}

/**
 * The LENGTH lanes' passthrough test: everything `isCssPassthroughValue` admits
 * plus absolute and font-relative lengths. Used by `spaceTokenPx` (space,
 * border widths, shadow geometry, inset) and by `radiusClass`.
 *
 * `zIndexValue` deliberately keeps the narrower `isCssPassthroughValue`: a
 * length is not a legal `z-index`, so widening there would admit nonsense
 * instead of closing a gap.
 */
export function isCssLengthPassthroughValue(value: string): boolean {
  return isCssPassthroughValue(value) || isCssAbsoluteLength(value)
}

/**
 * Shared core for the Tamagui `SpaceKeys` resolvers: number → px, `$token` → px off `SPACE_TOKEN_PX`, the
 * non-token family → verbatim in arbitrary-value form (spaces → `_`, ready for a `[…]` class slot), unknown
 * token → throw. `label` names the caller (the long-tail lane passes the prop) so a typo says who rejected it.
 */
export function spaceTokenPx(value: string | number, label: string): string {
  if (typeof value === 'number') {
    return `${value}px`
  }
  if (!value.startsWith('$') && isCssLengthPassthroughValue(value)) {
    return arbitrary(value)
  }
  const px = lookupToken(SPACE_TOKEN_PX, value)
  if (px === undefined) {
    throw new Error(`compat: unknown ${label} token "${value}"`)
  }
  return `${px}px`
}

/** Callers guard `null`/`undefined` out before this point (INFRA-3821) — both mean "not set", never "resolve nothing". */
export function spacePx(value: NonNullable<SpaceValue>): string {
  return spaceTokenPx(unwrapVariable(value), 'space')
}

/**
 * Border widths, shadow geometry and the px transforms are Tamagui `SpaceKeys`:
 * same contract as `spacePx` (a typo'd token fails loudly instead of emitting a
 * dead class).
 */
export function borderWidthPx(value: BorderWidthValue): string {
  return spaceTokenPx(unwrapVariable(value), 'border-width space')
}

/** `zIndex` is a Tamagui `ZIndexKey`: resolve the token to its layer number; the universal non-token leg passes through. */
export function zIndexValue(value: ZIndexValue): string {
  const resolved = unwrapVariable(value)
  if (typeof resolved === 'number') {
    return String(resolved)
  }
  if (!resolved.startsWith('$') && isCssPassthroughValue(resolved)) {
    return arbitrary(resolved)
  }
  const layer = lookupToken(Z_INDEX_TOKEN, resolved)
  if (layer === undefined) {
    throw new Error(`compat: unknown zIndex token "${resolved}"`)
  }
  return String(layer)
}

/** `label` names the caller, like `spaceTokenPx` (the long-tail lane passes the prop). */
export function sizeValue(value: SizeValue, label = 'size'): string {
  const resolved = unwrapVariable(value)
  if (typeof resolved === 'number') {
    return `${resolved}px`
  }
  if (resolved.startsWith('$')) {
    const px = lookupToken(SPACE_TOKEN_PX, resolved)
    if (px === undefined) {
      throw new Error(`compat: unknown ${label} token "${resolved}"`)
    }
    return `${px}px`
  }
  return resolved
}
