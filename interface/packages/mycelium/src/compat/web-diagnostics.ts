/**
 * Dev diagnostics for the compat WEB legs — the mirror of
 * `native-diagnostics.ts` (INFRA-3509 review round 1).
 *
 * The widened `CompatStyleProp` typechecks pure React Native style keys on
 * web-rendered primitives, where React DOM assigns unknown camelCase keys
 * onto `CSSStyleDeclaration` and they silently no-op — the same silent
 * failure class `warnUnsupportedNativeProps` removes on native, pointed the
 * other way. Same doctrine too: a throw in converted production paths would
 * be worse than the bug, so the signal is a development-build one-time
 * `console.warn`, emitted from the one canonical merge (`mergeCompatStyle`)
 * so compat web legs get it without opting in. The one exception is the
 * checkbox pair, which flattens through its own `flattenStyleProp`
 * (checkbox-compat/resolve.ts) instead of `mergeCompatStyle`; its two WEB
 * legs call `warnUnsupportedWebStyleKeys` directly on the flattened result.
 * It must never be wired into `flattenCompatStyle` itself: that walker is
 * platform-neutral (the checkbox pair's NATIVE leg flattens through it), and
 * these keys are perfectly valid there.
 */
import type * as React from 'react'
// Type-only — react-native runtime imports are banned outside .native legs.
import type { TextStyle, ViewStyle } from 'react-native'
import { isDevelopmentBuild } from './dev-build'
import type { CompatStyleProp } from './props'

/**
 * `ViewStyle`/`TextStyle` keys with no CSS counterpart. `satisfies` keeps
 * every entry a real RN style key; `TextStyle` keys are included because
 * `TextCompat`'s `style` admits `StyleProp<TextStyle>` through the same
 * union. Keys RN shares with CSS (`transform`, `direction`, `verticalAlign`,
 * …) must stay out — only the VALUE can be wrong there, and only the
 * array-form keys are detectable by shape (handled separately below).
 */
const RN_ONLY_STYLE_KEYS = [
  // Shadows — CSS spells all of these as boxShadow / textShadow strings.
  'elevation',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  // Axis shorthands — CSS spells these marginInline / marginBlock / paddingInline / paddingBlock.
  'marginHorizontal',
  'marginVertical',
  'paddingHorizontal',
  'paddingVertical',
  // Logical start/end — CSS spells these *-inline-start / *-inline-end / inset-inline-*.
  'start',
  'end',
  'marginStart',
  'marginEnd',
  'paddingStart',
  'paddingEnd',
  'borderStartColor',
  'borderEndColor',
  'borderStartWidth',
  'borderEndWidth',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
  'borderCurve',
  // RN's legacy standalone transform keys — CSS has rotate/scale/translate properties, not these.
  'transformMatrix',
  'rotation',
  'scaleX',
  'scaleY',
  'translateX',
  'translateY',
  // TextStyle keys with no CSS property at all.
  'includeFontPadding',
  'textAlignVertical',
  'writingDirection',
  // RN's experimental background gradient keys — typed array-or-string, but
  // React DOM has no `experimental_*` CSS property, so BOTH forms no-op on
  // web; they belong here, not in the shape-detected array-form ledger.
  'experimental_backgroundImage',
  'experimental_backgroundSize',
  'experimental_backgroundPosition',
  'experimental_backgroundRepeat',
] as const satisfies readonly (keyof ViewStyle | keyof TextStyle)[]

const RN_ONLY_STYLE_KEY_SET: ReadonlySet<string> = new Set(RN_ONLY_STYLE_KEYS)

/**
 * Keys whose RN type admits an array form where CSS needs a single string, so
 * an array value stringifies uselessly and CSSOM drops it — detectable by
 * shape. This is the COMPLETE such set from an exhaustive audit of the RN
 * 0.85.3 style types (`Libraries/StyleSheet/StyleSheetTypes.d.ts` — every
 * `ReadonlyArray<`/`Array<`/`[]` member of `ViewStyle`/`TextStyle`/
 * `ImageStyle` and their base interfaces); a key missing here is an RN
 * version-bump concern, not an omission. `transform`, `boxShadow`, `filter`,
 * and `transformOrigin` are typed `…[] | string`; `fontVariant`
 * (`TextStyleIOS`) is typed array-only, but CSS `font-variant` needs a
 * space-separated string, so its comma-joined stringification is equally
 * useless. The remaining array-typed keys live in `RN_ONLY_STYLE_KEYS`
 * instead: `transformMatrix` and the `experimental_background*` quartet have
 * no CSS counterpart in ANY value form.
 *
 * Detection caveat: a ONE-element array of a STRING coerces to the element
 * itself — byte-identical to passing it directly — so a lone `fontVariant`
 * keyword or `transformOrigin: ['50%']` renders fine and must not warn. A
 * lone NUMBER is not safe: `[50]` coerces to `"50"` BEFORE React DOM's
 * numeric-value handling, so the `px` it would append to a bare `50` never
 * happens and CSSOM drops the unitless string. Multi-element arrays
 * (comma-joined where CSS needs spaces or a single value) and object elements
 * (`"[object Object]"`, e.g. a one-entry RN `transform` array) are broken too. (Keyword examples are
 * deliberately not spelled out here: RN's font-variant values are also
 * Tailwind utility names, and the mobile global.css scan reads this file — a
 * literal in a comment would register the class into the native bundle and
 * upset the drift gate's ledger.)
 */
const ARRAY_FORM_STYLE_KEYS = [
  'transform',
  'transformOrigin',
  'boxShadow',
  'filter',
  'fontVariant',
] as const satisfies readonly (keyof ViewStyle | keyof TextStyle)[]

const ARRAY_FORM_STYLE_KEY_SET: ReadonlySet<string> = new Set(ARRAY_FORM_STYLE_KEYS)

/**
 * The keys in a FLATTENED caller style that render as nothing on web: the
 * RN-only ledger, plus any array-form key carrying an array value.
 */
function unsupportedWebStyleKeys(style: React.CSSProperties): string[] {
  // Explicit-undefined entries (`marginHorizontal: cond ? 8 : undefined`) would
  // never have rendered anyway; `Array.isArray` already excludes them below.
  const keys = Object.entries(style)
    .filter(([key, value]) => RN_ONLY_STYLE_KEY_SET.has(key) && value !== undefined)
    .map(([key]) => key)
  for (const key of ARRAY_FORM_STYLE_KEYS) {
    const value = style[key]
    // A lone STRING element coerces to itself, rendering exactly as if passed
    // directly (`transformOrigin: ['50%']`) — skip it. A lone number is NOT
    // safe: it stringifies before React DOM can append `px`, so keep warning.
    if (Array.isArray(value) && !(value.length === 1 && typeof value[0] === 'string')) {
      keys.push(key)
    }
  }
  return keys
}

const warned = new Set<string>()
const warnedRegisteredIds = new Set<number>()

/** Test hook: the warn ledgers are process-wide, so suites must be able to reset them. */
export function __resetWebStyleWarnings(): void {
  warned.clear()
  warnedRegisteredIds.clear()
}

/** Depth-first collection of every numeric entry of a raw (pre-flatten) `StyleProp` tree. */
function collectRegisteredStyleIds(style: unknown, into: number[] = []): number[] {
  if (typeof style === 'number') {
    into.push(style)
  } else if (Array.isArray(style)) {
    for (const entry of style) {
      collectRegisteredStyleIds(entry, into)
    }
  }
  return into
}

/**
 * A numeric `StyleProp` entry is a `RegisteredStyle` id — what the RN types say
 * `StyleSheet.create` returns. The web flatten (`flattenCompatStyle`) drops it:
 * a web bundle has no stylesheet registry to resolve it against, so a shared
 * style file handed to a cross-platform component would lose its styling on
 * web with no signal (INFRA-3509 review round 2). One warning per distinct id,
 * development builds only; production pays only the `isDevelopmentBuild`
 * check. Takes the RAW caller style — after the flatten the id is already
 * gone. Wired at the web seams only (`mergeCompatStyle`, and the checkbox
 * pair's web legs next to their `warnUnsupportedWebStyleKeys` calls), never
 * inside the platform-neutral walker: the checkbox NATIVE leg flattens through
 * it, where dropping a number is exactly what RN's own `StyleSheet.flatten`
 * does (pinned by the checkbox native-parity suite, Layer 1d).
 */
export function warnDroppedRegisteredStyle(style: CompatStyleProp | undefined): void {
  if (!isDevelopmentBuild()) {
    return
  }
  for (const id of collectRegisteredStyleIds(style)) {
    if (warnedRegisteredIds.has(id)) {
      continue
    }
    warnedRegisteredIds.add(id)
    // oxlint-disable-next-line no-console -- dev-only diagnostic; the alternative is silently unstyled output (the flatten drops the id with no signal)
    console.warn(
      `compat: style contains a RegisteredStyle id (${id}) — web builds have no StyleSheet registry to resolve it, so the entry renders as nothing. Pass the style object itself instead.`,
    )
  }
}

/**
 * One warning per style key, development builds only — the web twin of
 * `warnUnsupportedNativeProps`. Production builds pay only the
 * `isDevelopmentBuild` check.
 */
export function warnUnsupportedWebStyleKeys(style: React.CSSProperties | undefined): void {
  if (style === undefined || !isDevelopmentBuild()) {
    return
  }
  for (const key of unsupportedWebStyleKeys(style)) {
    if (warned.has(key)) {
      continue
    }
    warned.add(key)
    const reason = ARRAY_FORM_STYLE_KEY_SET.has(key)
      ? `is React Native array-form — React DOM needs a single CSS ${key} string`
      : 'is React Native-only — React DOM has no such CSS property'
    // oxlint-disable-next-line no-console -- dev-only diagnostic; the alternative is a silently missing style (React DOM drops unknown style keys without any signal)
    console.warn(`compat: style key "${key}" ${reason}, so the declaration renders as nothing on web.`)
  }
}
