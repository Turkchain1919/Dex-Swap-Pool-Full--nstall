/**
 * The native `display` gate for the compat CLASS LANE.
 *
 * RN's `display` accepts only the values in `RN_DISPLAY_VALUES`
 * (compat/native-values.ts — the same allowlist FlexCompat's direct-carrier
 * filter checks); every other value the compilers can emit (`grid`,
 * `inline-flex`, `block`, …) errors or lays out undefined once it reaches
 * Yoga. The compilers spell `display` two ways — Flex's enum utilities
 * (`DISPLAY_CLASS`: `grid`, `hidden`, …) and Text's arbitrary tokens
 * (`[display:grid]`) — and a pool-/variant-scoped value arrives PREFIXED
 * (`dark:grid`, `media-md:[display:grid]`, or unprefixed via the
 * `$platform-web` base-pool merge), so an anchored token match sees only the
 * direct carrier. This classifier reads the trailing utility through
 * `candidateSegments`, making it prefix-independent; the compiler output stays
 * byte-identical and the native LEGS drop the tokens from the string they
 * attach (the `stripNonNativeDisplayClasses` doctrine TextCompat established).
 *
 * `FlexCompat.native.tsx` owns the two DIRECT carriers — the top-level
 * `display` prop (stripped pre-compile) and the flattened user `style`
 * object; this module owns the class lane the pools compile into. Both
 * filter on the same `RN_DISPLAY_VALUES` allowlist.
 */
import { DISPLAY_CLASS } from '../flex-compat/flex-style-classes'
import { GROUP_STATE_PROP_PREFIX } from './group'
import { MEDIA_VARIANT } from './media'
import { candidateSegments } from './native-safe'
import { isNonNativeDisplayValue } from './native-values'
import { PSEUDO_STYLE_KEYS } from './pseudo'

const DISPLAY_CLASS_PATTERN = /^\[display:(.+)]$/

/** Display enum utility → the CSS value it declares (`hidden` → `none`), inverted from the compiler's own map. */
const DISPLAY_UTILITY_VALUE: ReadonlyMap<string, string> = new Map(
  Object.entries(DISPLAY_CLASS).map(([value, cls]) => [cls, value]),
)

/** The CSS `display` value a class token declares, ignoring any variant prefix chain, or undefined. */
function displayValueOf(token: string): string | undefined {
  const { utility } = candidateSegments(token)
  const arbitrary = DISPLAY_CLASS_PATTERN.exec(utility)
  if (arbitrary !== null) {
    return arbitrary[1]
  }
  return DISPLAY_UTILITY_VALUE.get(utility)
}

/** Whether a single class token declares a `display` React Native cannot carry (per `RN_DISPLAY_VALUES`). */
export function isNonNativeDisplayClass(token: string): boolean {
  return isNonNativeDisplayValue(displayValueOf(token))
}

/**
 * Drop every class token declaring a non-RN `display` — under any variant
 * prefix — from a compiled className. Removing whole tokens keeps every
 * remaining class a literal the scanner already found.
 */
export function stripNonNativeDisplayClasses(className: string): string {
  return className
    .split(' ')
    .filter((token) => !isNonNativeDisplayClass(token))
    .join(' ')
}

/** The style pools whose `display` compiles into the native className (media, platform-web merge, themes). */
const DISPLAY_POOL_KEYS: readonly string[] = [
  ...Object.keys(MEDIA_VARIANT),
  '$platform-web',
  '$theme-dark',
  '$theme-light',
]

function hasNonNativeDisplay(style: unknown): boolean {
  if (typeof style !== 'object' || style === null) {
    return false
  }
  return isNonNativeDisplayValue((style as Record<string, unknown>)['display'])
}

/**
 * The pseudo-state pools (`hoverStyle`, `pressStyle`, …) carrying a non-RN
 * `display` under `prefix` — `compose.ts`'s `pushStyleAndPseudo` compiles a
 * nested pseudo pool on every pool value, so these ride the class lane under
 * a variant prefix exactly like the pools themselves.
 */
function pseudoDisplayDrops(style: Record<string, unknown>, prefix: string): string[] {
  const out: string[] = []
  for (const key of PSEUDO_STYLE_KEYS) {
    if (hasNonNativeDisplay(style[key])) {
      out.push(`${prefix}${key}.display`)
    }
  }
  return out
}

/**
 * The prop names whose `display` value the leg strips — `display` for the
 * top-level prop, `$md.display` / `$platform-web.display` /
 * `hoverStyle.display` / … for the pools — in the shape
 * `warnUnsupportedNativeProps` consumes. The class-lane strip above is the
 * safety property; this is what keeps the loss visible (a uniwind class miss
 * is otherwise completely silent). FlexCompat's direct-carrier filter pushes
 * its own `display` entry for the top-level prop and the style object — the
 * ledger dedupes per component × prop, so the two reporters never
 * double-warn.
 */
export function droppedNonNativeDisplayProps(props: Readonly<Record<string, unknown>>): string[] {
  const out: string[] = []
  if (hasNonNativeDisplay(props)) {
    out.push('display')
  }
  out.push(...pseudoDisplayDrops(props, ''))
  for (const key of Object.keys(props)) {
    const isDisplayPool = DISPLAY_POOL_KEYS.includes(key)
    if (!isDisplayPool && !key.startsWith(GROUP_STATE_PROP_PREFIX)) {
      continue
    }
    const pool = props[key]
    if (typeof pool !== 'object' || pool === null) {
      continue
    }
    if (hasNonNativeDisplay(pool)) {
      out.push(`${key}.display`)
    }
    if (!isDisplayPool) {
      // `$group-*` values compile flat — no nested pseudo/platform pools.
      continue
    }
    const poolRecord = pool as Record<string, unknown>
    out.push(...pseudoDisplayDrops(poolRecord, `${key}.`))
    // Media pools nest their own $platform-web override (see poolChunks).
    const nestedPlatform = poolRecord['$platform-web']
    if (typeof nestedPlatform === 'object' && nestedPlatform !== null) {
      if (hasNonNativeDisplay(nestedPlatform)) {
        out.push(`${key}.$platform-web.display`)
      }
      out.push(...pseudoDisplayDrops(nestedPlatform as Record<string, unknown>, `${key}.$platform-web.`))
    }
  }
  return out
}
