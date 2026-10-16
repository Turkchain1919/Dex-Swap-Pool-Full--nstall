/**
 * Unknown-key detection for the pooled compat namespaces (`$theme-*`,
 * `$platform-*`, media, and the `xStyle`/`xStyles` pseudo-pool shape):
 * split out of `compose.ts` so that file's pool-walk orchestration doesn't
 * carry the validation tables too (INFRA-3260).
 */
import { reportUnknownCompatKey } from './diagnostics'
import { MEDIA_VARIANT } from './media'
import type { CompatPlatformProps, CompatThemeProps } from './props'
import { PSEUDO_VARIANT, PSEUDO_STYLE_KEYS } from './pseudo'

/**
 * One preset pool's classes. The preset tables are closed maps, so a name
 * outside them (reachable through a widening spread — the closed unions stop
 * literals only) used to index to `undefined` and either crash the marker
 * split or vanish silently; unknown names go through the loud path instead
 * (INFRA-3260).
 */
export function presetPoolClasses({
  pool,
  preset,
  presets,
}: {
  pool: string
  preset: string | undefined
  presets: Record<string, string>
}): string[] {
  if (preset === undefined) {
    return []
  }
  const classes = Object.hasOwn(presets, preset) ? presets[preset] : undefined
  if (classes === undefined) {
    reportUnknownCompatKey({ what: `${pool} preset`, key: preset, known: Object.keys(presets) })
    return []
  }
  return [classes]
}

/**
 * Keyed on `CompatThemeProps`/`CompatPlatformProps` (props.ts) via `satisfies`
 * instead of a free-hand string list: adding, removing, or renaming a pooled
 * theme/platform key there now fails this file's typecheck too, instead of
 * silently drifting out of sync with a third hand-maintained copy (review).
 */
const THEME_POOL_KEYS_TABLE = { '$theme-dark': true, '$theme-light': true } satisfies Record<
  keyof CompatThemeProps<unknown>,
  true
>
const THEME_POOL_KEYS: ReadonlySet<string> = new Set(Object.keys(THEME_POOL_KEYS_TABLE))
/** `$platform-native`/`-ios`/`-android` are documented accept-and-ignore on web (props.ts) — valid keys, never reported. */
const PLATFORM_POOL_KEYS_TABLE = {
  '$platform-web': true,
  '$platform-native': true,
  '$platform-ios': true,
  '$platform-android': true,
} satisfies Record<keyof CompatPlatformProps<unknown>, true>
const PLATFORM_POOL_KEYS: ReadonlySet<string> = new Set(Object.keys(PLATFORM_POOL_KEYS_TABLE))
/**
 * Pseudo-pool-shaped key: `hoverStyle` and the `hoverStyles` typo family.
 * Long-tail props (`borderStyle`, `outlineStyle`, …) and `forceStyle` share
 * the suffix but carry string/number values, so only OBJECT values count as
 * pool-shaped.
 */
const PSEUDO_SHAPED_KEY = /Styles?$/

/**
 * `*Style`-suffixed keys that are real animation props (props.ts), not a
 * pseudo pool or a typo of one — excluded from the pseudo-shaped-key check
 * below so a legitimate `enterStyle` object doesn't misfire it. `exitStyle`
 * is deliberately absent: it isn't a supported prop yet (INFRA-3289, the
 * Presence/AnimatePresence lifecycle), so a runtime value still reports as
 * unknown. Only `dom.tsx` reads a top-level `enterStyle` — nested pool values
 * ($platform-web, media, theme, group) have no reader, so the exemption is
 * top-level only (see the `isTopLevel` option below); a nested `enterStyle`
 * stays loud, the same silent-drop this validator exists to catch.
 */
const NON_PSEUDO_STYLE_SUFFIXED_KEYS: ReadonlySet<string> = new Set(['enterStyle'])

/**
 * `$group-`/`$theme-`/`$platform-` are the only pooled namespaces shaped
 * `$word-value`; every media key is a bare camelCase token (`$midHeight`,
 * not `$mid-height`). A key matching this shape past those three prefixes
 * is a namespace we don't have yet, not a mistyped media key — reported as
 * such instead of defaulting into the media vocabulary (INFRA-3260 review).
 */
const NAMESPACE_SHAPED_KEY = /^\$[a-z]+-/
const KNOWN_POOL_NAMESPACES = ['$group-*', '$theme-*', '$platform-*', ...Object.keys(MEDIA_VARIANT)]

/**
 * Every pool walk in `compose.ts` is table-driven, so a key outside the
 * tables is structurally invisible to it: no class, no error (INFRA-3260 —
 * a typo'd `$hoverStyle`-family or `$`-pool key arriving through a spread
 * compiled to nothing with every gate green). The pool namespaces are closed
 * sets, so an unknown key is rejected here — development builds throw,
 * production builds report at error level (bounded) and keep dropping — see
 * `reportUnknownCompatKey`. Stricter than the unsupported-`$group-*` throw in
 * `compose.ts`'s pool walk, which is unconditional (crashes in production too).
 */
export function validatePoolKeys(props: Record<string, unknown>): void {
  for (const key of Object.keys(props)) {
    if (key.startsWith('$')) {
      if (key.startsWith('$group-')) {
        // Parsed (and rejected when unsupported) by the group pool walk.
        continue
      }
      if (key.startsWith('$theme-')) {
        if (!THEME_POOL_KEYS.has(key)) {
          reportUnknownCompatKey({ what: 'theme prop', key, known: [...THEME_POOL_KEYS] })
        }
      } else if (key.startsWith('$platform-')) {
        if (!PLATFORM_POOL_KEYS.has(key)) {
          reportUnknownCompatKey({ what: 'platform prop', key, known: [...PLATFORM_POOL_KEYS] })
        }
      } else if (!(key in MEDIA_VARIANT)) {
        if (NAMESPACE_SHAPED_KEY.test(key)) {
          reportUnknownCompatKey({ what: 'pool namespace', key, known: KNOWN_POOL_NAMESPACES })
        } else {
          reportUnknownCompatKey({ what: 'media prop', key, known: Object.keys(MEDIA_VARIANT) })
        }
      }
      continue
    }
  }
  validatePseudoShapedKeys(props, { isTopLevel: true })
}

/**
 * Object-valued `xStyle`/`xStyles`-shaped key outside the pseudo pool table:
 * a typo'd pseudo pool (`hoverStyles` for `hoverStyle`) that compiles to
 * nothing. Pool VALUES carry their own nested pseudo pools too — every media
 * key, `$platform-web`, and (on the emission path) each theme key are typed
 * `S & CompatPseudoProps<S>` — so `$md={{ hoverStyles: {...} }}` is the same
 * silent drop as a top-level typo, one level down (INFRA-3260 review).
 * Shared by `validatePoolKeys` (the top-level props bag) and `compose.ts`'s
 * `pushStyleAndPseudo` (every nested value it compiles): same regex, same
 * pool table, so a typo is caught the same way regardless of which pooled
 * namespace it arrives through. `$group-*` values and `forceStyle`'s target
 * are typed `S` alone (no nested pseudo pool), so they're validated only at
 * whatever level they're compiled at, matching their type.
 *
 * `isTopLevel` scopes `NON_PSEUDO_STYLE_SUFFIXED_KEYS`: only the top-level
 * props bag can carry a real `enterStyle` (`dom.tsx` reads it there and
 * nowhere else), so a nested pool value — `$md={{ enterStyle: {...} }}` — must
 * still report loud instead of silently compiling to nothing.
 */
export function validatePseudoShapedKeys(
  style: Record<string, unknown>,
  { isTopLevel = false }: { isTopLevel?: boolean } = {},
): void {
  for (const key of Object.keys(style)) {
    if (isTopLevel && NON_PSEUDO_STYLE_SUFFIXED_KEYS.has(key)) {
      continue
    }
    if (PSEUDO_SHAPED_KEY.test(key) && !(key in PSEUDO_VARIANT)) {
      const value = style[key]
      if (typeof value === 'object' && value !== null) {
        reportUnknownCompatKey({ what: 'pseudo-state prop', key, known: [...PSEUDO_STYLE_KEYS] })
      }
    }
  }
}
