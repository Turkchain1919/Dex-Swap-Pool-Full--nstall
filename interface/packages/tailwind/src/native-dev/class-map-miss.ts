/**
 * Dev-only loudness for uniwind class-map misses (INFRA-3238).
 *
 * uniwind's native store skips a className token that has no stylesheet entry
 * with a bare `continue` (uniwind/src/core/native/store.ts) — a typo, a class
 * the build-time scanner never saw, and a web-only utility all fail identically
 * and silently. This module is the pure half of the warning: classify which
 * tokens of an attached className are real misses, given a membership
 * predicate for uniwind's compiled class map. The impure half (obtaining the
 * predicate from uniwind's store and console-warning) lives with the app
 * runtime (apps/mobile) so this package stays dependency-free; the native
 * parity suite drives this classifier against uniwind's real compiled map.
 */

/**
 * Variant families that are STRUCTURALLY unreachable in the native class map —
 * Tailwind compiles them for web interaction/DOM semantics that uniwind's
 * native pipeline never emits an entry for, so a miss on them is expected on
 * every native render and warning would be pure noise. Everything here is
 * measured in the native parity suites (see
 * packages/mycelium/src/compat/native-diagnostics.ts for the prop-level twin
 * of this ledger).
 */
const STRUCTURALLY_UNREACHABLE_PREFIXES: readonly string[] = [
  'hover:',
  'focus-visible:',
  'focus-within:',
  'group-',
  'peer-',
  'aria-disabled:',
  'not-dark:',
  'web:',
  // Coexistence bridge variant (compat.css): scopes under Tamagui's
  // JS-toggled `.t_group_hover` DOM marker, which exists only in the web DOM
  // — Tamagui native drives group state through its animation driver, never
  // classes. Web-only by construction, like `group-*` above; leaves with the
  // variant itself when the last legacy group anchor above a compat consumer
  // converts (INFRA-3489).
  'legacy-group-hover:',
  // DOM-semantics pseudo-element variants: file inputs and placeholder text
  // are web-only concepts, uniwind never emits entries for them.
  'file:',
  'placeholder:',
]

/**
 * Marker classes never get (or need) a stylesheet entry: bare `group`/`peer`
 * and their NAMED forms (`group/field`, `peer/sbtn`) exist only to be
 * referenced by `group-*`/`peer-*` variants on other elements — the web
 * compiler emits no rule for them either (see tailwind-compile.ts's
 * isInertMarkerClass).
 */
function isMarkerClass(token: string): boolean {
  return token === 'group' || token === 'peer' || token.startsWith('group/') || token.startsWith('peer/')
}

/**
 * Utility families that are known-inert on native regardless of stylesheet
 * membership: `animate-spore-*` presets compile an entry (compat.css is in the
 * native entry), but uniwind carries no keyframes at all, so the animation
 * never runs — and animations.css cannot be imported wholesale to change that
 * (it is full of web-only classes). The native-bundle parity suite pins the
 * gap; allowlisted here so the tier never pages as a "miss" in either
 * direction while it is ledgered.
 * TODO(INFRA-3289): remove when the exit-animations/keyframes decision lands.
 */
const KNOWN_INERT_UTILITY_PREFIXES: readonly string[] = ['animate-spore-']

function isUnreachableVariantSegment(segment: string): boolean {
  // Arbitrary-selector/at-rule variants (`[&_svg]:`, `[&>tr>*]:`) and the
  // child/descendant combinator variants (`*:`, `**:`) compile to CSS
  // descendant selectors — RN has no selector matching, uniwind never emits
  // an entry for them.
  if (segment.startsWith('[') || segment === '*' || segment === '**') {
    return true
  }
  // DOM data-attribute variants (`data-[state=open]:`, `data-active:`) and
  // their ancestor form (`in-data-[side=top]:`): no DOM, no data attributes.
  if (segment.startsWith('data-') || segment.startsWith('in-data-')) {
    return true
  }
  return STRUCTURALLY_UNREACHABLE_PREFIXES.some((prefix) =>
    prefix.endsWith(':') ? `${segment}:` === prefix : segment.startsWith(prefix),
  )
}

/**
 * Split a candidate on TOP-LEVEL `:` only — a `:` inside brackets belongs to
 * an arbitrary value/selector, not a variant boundary (`[text-decoration:none]`
 * is a single utility segment; `[&_svg:not(...)]:size-4` is one variant plus
 * the utility). A naive split would misread both.
 */
function splitTopLevelSegments(token: string): string[] {
  const segments: string[] = []
  let depth = 0
  let current = ''
  for (const ch of token) {
    if (ch === '[' || ch === '(') {
      depth += 1
    } else if (ch === ']' || ch === ')') {
      depth = Math.max(0, depth - 1)
    } else if (ch === ':' && depth === 0) {
      segments.push(current)
      current = ''
      continue
    }
    current += ch
  }
  segments.push(current)
  return segments
}

/** Whether a class token belongs to a variant or utility family that can never resolve natively. */
export function isStructurallyUnreachableNativeClass(token: string): boolean {
  if (isMarkerClass(token)) {
    return true
  }
  const segments = splitTopLevelSegments(token)
  const utility = segments.at(-1) ?? token
  if (KNOWN_INERT_UTILITY_PREFIXES.some((prefix) => utility.startsWith(prefix))) {
    return true
  }
  // A token may stack variants (`media-md:hover:flex`) — any unreachable
  // segment makes the whole candidate unreachable. Only the utility segment
  // (the last one) is exempt from the variant check.
  return segments.slice(0, -1).some(isUnreachableVariantSegment)
}

/**
 * The tokens of `className` that are genuine native class-map misses: no entry
 * in uniwind's compiled stylesheet AND not in a structurally-unreachable
 * variant family. An empty result means every token either resolves or is a
 * known-dead family.
 */
export function collectNativeClassMapMisses({
  className,
  hasClass,
}: {
  className: string
  hasClass: (token: string) => boolean
}): string[] {
  const misses: string[] = []
  for (const token of className.split(' ')) {
    if (token === '' || isStructurallyUnreachableNativeClass(token)) {
      continue
    }
    if (!hasClass(token)) {
      misses.push(token)
    }
  }
  return misses
}

/**
 * A one-shot console warner over `collectNativeClassMapMisses`: each missed
 * token warns once per process, so a miss inside a list row cannot flood the
 * console. `warn` is injectable for tests; callers gate on `__DEV__` — this
 * module never checks it itself.
 */
export function createNativeClassMapMissWarner({
  hasClass,
  warn,
}: {
  hasClass: (token: string) => boolean
  warn: (message: string) => void
}): (className: string) => void {
  const warned = new Set<string>()
  return (className: string): void => {
    for (const token of collectNativeClassMapMisses({ className, hasClass })) {
      if (warned.has(token)) {
        continue
      }
      warned.add(token)
      warn(
        `uniwind class-map miss: "${token}" has no entry in the compiled native stylesheet and will silently not style. ` +
          "Common causes: the class is runtime-composed (invisible to uniwind's build-time scanner — add it to the safelist), " +
          'or it relies on CSS the native entry (packages/tailwind/native.css) does not import.',
      )
    }
  }
}
