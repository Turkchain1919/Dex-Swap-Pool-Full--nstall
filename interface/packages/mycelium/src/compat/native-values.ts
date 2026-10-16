/**
 * Value resolvers for the compat native style lane (INFRA-3229 / INFRA-3272).
 *
 * The compat prop types admit `$` tokens in number-typed positions — the
 * INFRA-3232 widening (`BorderWidthValue`, `ZIndexValue` in `compat/props.ts`)
 * matched legacy Tamagui, which files every `border*Width`, shadow geometry
 * value and `x`/`y` under `SpaceKeys` and `zIndex` under `ZIndexKeys`. The web
 * leg resolves those tokens at class-emission time (`borderWidthPx` /
 * `zIndexValue` / `sizeValue` in `compat/style-classes.ts`) and THROWS on an
 * unknown token. On native the stakes are higher: a raw `'$sticky'` string
 * reaching Fabric in a number-typed style key is a hard crash (`Exception in
 * HostFunction: Value is a string, expected a number`), so the native
 * resolvers return `undefined` on a miss and the style builders report the
 * prop through `dropped` — a dev warning and an omitted declaration instead of
 * a redbox in a converted production path, the same failure doctrine as the
 * rest of the lane (`compat/native-diagnostics.ts`).
 */
import type { OpaqueColorValue } from 'react-native'
import type { BorderWidthValue, ColorValue, CompatStyleProps, SizeValue, SpaceValue, ZIndexValue } from './props'
import { hasOwnBorderWidth } from './style-props'
import {
  COLOR_TOKEN_CLASS,
  lookupToken,
  PALETTE_COLOR_LITERAL,
  SPACE_TOKEN_PX,
  THEMED_COLOR_TOKEN_CLASSES,
  unwrapVariable,
  unwrapVariableForNativeStyle,
  Z_INDEX_TOKEN,
} from './tokens'

// Fraction spelled as a top-level alternative rather than `\d+(?:\.\d+)?`: the
// nested quantifier trips `security(detect-unsafe-regex)`'s star-height check.
export const PX_STRING = /^(-?\d+\.\d+|-?\d+)px$/
const PERCENT_STRING = /^(?:-?\d+\.\d+|-?\d+)%$/

/**
 * The only `display` values React Native's `ViewStyle`/`TextStyle` accepts.
 * Every other `DisplayValue` (`grid`, `inline-grid`, `block`, `inline`,
 * `inline-flex`, `inherit`, `unset`) is web-only: it either errors or lays out
 * undefined on a native host (Yoga). The native legs allowlist against this set
 * — TextCompat strips the compiled `[display:…]` className token, FlexCompat
 * strips the raw `display` value from both carriers — rather than denylist the
 * few known-bad values, so a new `DisplayValue` cannot silently reopen the gap.
 */
export const RN_DISPLAY_VALUES: ReadonlySet<string> = new Set(['flex', 'none', 'contents'])

/**
 * A web-only `display` per `RN_DISPLAY_VALUES` — the shared allowlist check the
 * native legs filter on. Non-string values (`undefined`, RN's own) are
 * native-safe and return `false`.
 */
export function isNonNativeDisplayValue(display: unknown): boolean {
  return typeof display === 'string' && !RN_DISPLAY_VALUES.has(display)
}

/**
 * `12` / `'50%'` / `'auto'` / `'$spacing12'` / a Variable → an RN dimension, or
 * undefined when inexpressible (calc()/var()/viewport units have no RN value,
 * so they get dropped-and-warned like every other web-only value).
 */
/** Callers guard `null`/`undefined` out before this point (INFRA-3821) — both mean "not set", never "resolve nothing". */
export function nativeSpace(value: NonNullable<SpaceValue>): number | `${number}%` | 'auto' | undefined {
  const resolved = unwrapVariable(value)
  if (typeof resolved === 'number') {
    return resolved
  }
  if (resolved === 'auto') {
    return 'auto'
  }
  if (PERCENT_STRING.test(resolved)) {
    return resolved as `${number}%`
  }
  return lookupToken(SPACE_TOKEN_PX, resolved)
}

/** `100` / `'100px'` / `'50%'` / `'auto'` / `'$spacing12'` / a Variable → an RN dimension. `'max-content'` has none. */
export function nativeSize(value: SizeValue): number | string | undefined {
  const resolved = unwrapVariable(value)
  if (typeof resolved === 'number') {
    return resolved
  }
  if (resolved.startsWith('$')) {
    return lookupToken(SPACE_TOKEN_PX, resolved)
  }
  if (resolved === 'auto' || PERCENT_STRING.test(resolved)) {
    return resolved
  }
  const px = PX_STRING.exec(resolved)
  return px === null ? undefined : Number(px[1])
}

/**
 * `2` / `'$spacing1'` → an RN number for the `SpaceKeys`-typed numeric props
 * (border widths, shadow geometry, `x`/`y`). Same token map as the web leg's
 * `borderWidthPx` (`$none` → `0` exactly like `borderWidth={0}`); `undefined`
 * on an unknown token where web throws — the caller must report the prop
 * through `dropped` rather than let the raw string reach Fabric.
 */
export function nativeBorderWidth(value: BorderWidthValue): number | undefined {
  const resolved = unwrapVariable(value)
  if (typeof resolved === 'number') {
    return resolved
  }
  return lookupToken(SPACE_TOKEN_PX, resolved)
}

/**
 * `3` / `'$sticky'` → an RN layer number, via the same `Z_INDEX_TOKEN` map the
 * web leg's `zIndexValue` resolves through; `undefined` on an unknown token
 * where web throws — the caller must report the prop through `dropped`.
 */
export function nativeZIndex(value: ZIndexValue): number | undefined {
  const resolved = unwrapVariable(value)
  if (typeof resolved === 'number') {
    return resolved
  }
  return lookupToken(Z_INDEX_TOKEN, resolved)
}

/**
 * A color the className lane already covers as a semantic utility
 * (`bg-surface1`, `border-surface3` + its `dark:` twin). Those must stay classes
 * so `Uniwind.setTheme()` keeps switching them.
 */
export function isSemanticColorToken(value: ColorValue): boolean {
  const resolved = unwrapVariableForNativeStyle(value)
  return (
    typeof resolved === 'string' &&
    (lookupToken(COLOR_TOKEN_CLASS, resolved) !== undefined ||
      lookupToken(THEMED_COLOR_TOKEN_CLASSES, resolved) !== undefined)
  )
}

/**
 * uniwind injects `borderColor: '#000000'` whenever a resolved style sets
 * `borderStyle` without a color (`uniwind/src/core/native/store.ts`), and
 * Tailwind's width utilities DO set `border-style`. The parity normalizer treats
 * black border colors as an RN default, so the drift ledger cannot see it. The
 * leg therefore declares the value itself — same pixels, but the result no longer
 * depends on an undocumented uniwind fallback.
 *
 * Lives here beside `nativeBorderColor` because the two answer one question
 * between them: what border colour this lane declares. This is the no-colour
 * half (a width with no `borderColor` prop at all); `nativeBorderColor` is the
 * half where a `borderColor` WAS set, and RN's black default is exactly what an
 * unparseable token falls back to there.
 */
export const IMPLICIT_BORDER_COLOR = '#000000'

/**
 * The class lane's fallback for a `$` colour token past both semantic maps: its
 * raw Spore palette literal, or `undefined` when there is none and the class lane
 * therefore DROPPED the declaration (`diagnostics.ts` `unmappedColorTokenClasses`).
 *
 * One function for both native colour surfaces, so the reject/fallback decision
 * has a single extension point. A third fallback source added to the class lane is
 * added here once, instead of silently desynchronising `backgroundColor` from
 * `borderColor` — the failure mode that produced every divergence on this lane.
 */
function paletteLiteralOrDropped(token: string): string | undefined {
  return lookupToken(PALETTE_COLOR_LITERAL, token)
}

/**
 * The RN `borderColor` a compat style object declares, or `undefined` for
 * "declare nothing and let the className lane own it".
 *
 * Four verdicts, mirroring `colorClasses` + `borderColorDropClasses` exactly:
 *   - a semantic/themed token → nothing, so it stays a class and
 *     `Uniwind.setTheme()` keeps switching it;
 *   - a `$` token with a raw Spore palette literal → that literal, off the SAME
 *     `PALETTE_COLOR_LITERAL` table the class lane falls back to. No width is
 *     needed: there is a real colour to paint, and a palette literal is
 *     theme-invariant, so resolving it here freezes nothing;
 *   - any OTHER `$` token → the class lane dropped it, so `transparent`, but only
 *     when this style object owns a border width — the same condition
 *     `borderColorDropClasses` keys on, so a ButtonCompat variant cell's border
 *     still wins otherwise;
 *   - anything else → through unchanged (CSS literals, `OpaqueColorValue`).
 *
 * The two `$` verdicts are why this is not a passthrough. A raw `"$accent3"` or
 * `"$blueBase"` string is unparseable to RN — `normalizeColor` returns null, so
 * `processColor` returns undefined and the declaration is discarded — and because
 * the leg's style object spreads AFTER the resolved className on device,
 * discarding it discards whatever the class lane put there too. That cost the
 * drop case its `border-transparent` and the palette case its literal, both
 * landing on RN's default BLACK edge beside a width. Worse for the palette case:
 * its `border-[#4981FF]` is an arbitrary class, invisible to uniwind's static
 * scanner, so this style object is the ONLY carrier of that colour on device.
 *
 * Both were unreachable while `colorClasses` threw for every `$` token past the
 * two maps (a palette literal did not exempt one), so the passthrough is older
 * than the divergence; now that the colour lane warns and continues, this lane
 * has to reach the class lane's verdict itself.
 */
export function nativeBorderColor(props: CompatStyleProps): string | OpaqueColorValue | undefined {
  const { borderColor } = props
  if (borderColor === undefined || isSemanticColorToken(borderColor)) {
    return undefined
  }
  const resolved = unwrapVariableForNativeStyle(borderColor)
  if (typeof resolved !== 'string' || !resolved.startsWith('$')) {
    return resolved
  }
  const literal = paletteLiteralOrDropped(resolved)
  if (literal !== undefined) {
    return literal
  }
  return hasOwnBorderWidth(props as Readonly<Record<string, unknown>>) ? 'transparent' : undefined
}

/**
 * The RN `backgroundColor` a compat style object declares, or `undefined` for
 * "declare nothing and let the className lane own it".
 *
 * The same three `$` verdicts as `nativeBorderColor`, minus the transparent
 * policy: this surface has no `border-transparent` analogue, because there is no
 * `RESET_CLASSES` background for a drop to have to override.
 *
 * The PALETTE case is why this function exists. The class lane falls back to the
 * literal and emits `bg-[#4981FF]`, an ARBITRARY class that uniwind's static
 * scanner never sees, so this style object is the only carrier of that colour on
 * device: passing the raw `"$blueBase"` string through meant web painted it and
 * native painted nothing. Unmasked by the same merge-base throw as both border
 * cases.
 *
 * The DROPPED case declares NOTHING, which is not the same as its old raw
 * passthrough even though RN discards that string either way. The difference is
 * the fall-through: the class lane drops rather than overrides precisely so a
 * variant cell's or base class's `bg-*` survives the merge, and this leg's style
 * spreads AFTER the resolved className on device — so a raw `"$accent3"` here
 * OVERRODE that background and then vanished, painting nothing where web kept the
 * variant's colour. Declaring nothing is what mirrors the class lane.
 */
export function nativeBackgroundColor(props: CompatStyleProps): string | OpaqueColorValue | undefined {
  const { backgroundColor } = props
  if (backgroundColor === undefined || isSemanticColorToken(backgroundColor)) {
    return undefined
  }
  const resolved = unwrapVariableForNativeStyle(backgroundColor)
  if (typeof resolved !== 'string' || !resolved.startsWith('$')) {
    return resolved
  }
  return paletteLiteralOrDropped(resolved)
}
