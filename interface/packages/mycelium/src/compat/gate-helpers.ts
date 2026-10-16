/**
 * Shared helpers for the three compat CSS gates — apps/web's built-client
 * check (`apps/web/scripts/check-client-build.ts`) and the extension's two
 * legs (`apps/extension/scripts/checkCompatCss.ts`,
 * `apps/extension/src/app/compat-emission.test.ts`) — so the closed-set
 * parsing, the floor, the vacuous-pass guards and the custom-property
 * RESOLUTION checks cannot diverge across gates (INFRA-3296; the emitted-class
 * parsing and fixtures already live in `emitted-classes.ts`).
 *
 * The reader stays TEXT-BASED deliberately: apps/web's gate reads the
 * safelist as text to avoid pulling the enumeration graph into a CI script,
 * so this module must never import `closed-set-manifest.ts`.
 *
 * Consumed by the app gates via the `// nx-ignore-next-line` relative-import
 * idiom, like `emitted-classes.ts`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { ANCHOR_BASE_VAR, ANCHOR_PSEUDO_CODE, anchorPseudoVar } from '../text-compat/anchor-vars'
import { PROBE_LEAK_CANARIES } from './emitted-classes'

export const REGENERATE_HINT = 'Regenerate with `bun nx run @universe/mycelium:generate:compat-classes`.'

/** Below this the safelist has been gutted — fail regardless of subset math. */
export const CLOSED_SET_FLOOR = 9_000

/**
 * The closed-set entries in a checked-in safelist file, with the
 * comment-and-blank filter every gate must apply identically. A missing file
 * throws LOUDLY: a Tailwind `@source` pointing at a missing path is a silent
 * no-op — the build stays green and every compat class disappears from the
 * CSS — so this reader is the only thing that catches it.
 */
export function readClosedSet(safelistPath: string): string[] {
  if (!existsSync(safelistPath)) {
    throw new Error(
      `Safelist not found at ${safelistPath}. An @source pointing at a missing file is a silent ` +
        `no-op: the build succeeds and every compat class disappears from the CSS. ${REGENERATE_HINT}`,
    )
  }
  return readFileSync(safelistPath, 'utf8')
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('/*'))
}

/** Throws when the closed set is below the floor (a gutted or truncated safelist). */
export function assertClosedSetFloor(closedSet: readonly string[]): void {
  if (closedSet.length < CLOSED_SET_FLOOR) {
    throw new Error(
      `The closed set has ${closedSet.length} classes (< ${CLOSED_SET_FLOOR}); the safelist looks gutted. ` +
        REGENERATE_HINT,
    )
  }
}

/**
 * An emptied canary list would let every probe-leak check pass with zero
 * assertions executed — the vacuous pass the extension gates already guarded
 * against and apps/web's gate did not (INFRA-3296 fix bar item 1) — so every
 * gate asserts it through here before filtering.
 */
export function assertProbeLeakCanariesNonEmpty(): void {
  if (PROBE_LEAK_CANARIES.length === 0) {
    throw new Error(
      'PROBE_LEAK_CANARIES is empty, so the probe-leak check cannot fail. ' +
        'Restore the canaries in packages/mycelium/src/compat/emitted-classes.ts.',
    )
  }
}

/* ------------------- custom-property RESOLUTION helpers -------------------- */
// Folded in from the former custom-property-resolution.ts (INFRA-3262), per
// the INFRA-3296 plan: emission gates prove a compat class has a rule; they
// cannot prove the rule RESOLVES — arbitrary-property classes emit
// unconditionally, so a stylesheet can carry the full closed set while every
// compat text color dereferences an undefined custom property and ships
// silently unstyled. These helpers make that observable.

/**
 * The custom-property families that only mycelium's side-car stylesheets
 * define (text-compat.css, button-compat.css). A `var()` reference to one of
 * these resolves only if the consuming app imports the side-cars — they are
 * not part of `@universe/tailwind`'s theme.
 *
 * Typed wide (not `as const`) so the gates' non-empty guards typecheck.
 */
export const SIDECAR_PROPERTY_PREFIXES: readonly string[] = ['--stext-', '--sbtn-']

/**
 * Properties in the side-car families that components assign at runtime through
 * inline style objects — a stylesheet never defines them, so the resolution
 * check must not demand it.
 */
export const RUNTIME_ASSIGNED_PROPERTIES: ReadonlySet<string> = new Set([
  '--sbtn-custom-outline',
  ANCHOR_BASE_VAR,
  ...Object.values(ANCHOR_PSEUDO_CODE).map(anchorPseudoVar),
])

/**
 * Keyframes the side-car stylesheets declare and compat components animate by
 * name at runtime (TextCompat's loading shine, Shimmer's sweep, ButtonCompat's
 * spinner) — invisible to any class-emission check for the same reason.
 *
 * Typed wide (not `as const`) so the gates' non-empty guards typecheck.
 */
export const SIDECAR_KEYFRAMES: readonly string[] = ['stext-shine', 'myc-shimmer', 'sbtn-rotate360']

/** Same vacuous-pass guard as the canary one, for the resolution gate's lists. */
export function assertSidecarGateListsNonEmpty(): void {
  if (SIDECAR_PROPERTY_PREFIXES.length === 0 || SIDECAR_KEYFRAMES.length === 0) {
    throw new Error(
      'SIDECAR_PROPERTY_PREFIXES or SIDECAR_KEYFRAMES is empty, so the resolution gate cannot fail. ' +
        'Restore them in packages/mycelium/src/compat/gate-helpers.ts.',
    )
  }
}

// Literal patterns capture whole `--custom-property` / keyframe-name tokens;
// callers filter by prefix or exact name in JS, so no RegExp is ever built
// from input (security/detect-non-literal-regexp). The reference pattern also
// captures whether a fallback follows the name — `var(--x, fallback)` resolves
// through its fallback even when nothing defines the property.
const VAR_REFERENCE_PATTERN = /var\(\s*(--[\w-]*)\s*(,)?/g
const DECLARATION_PATTERN = /(?:^|[{;\s])(--[\w-]*)\s*:/gm
const KEYFRAMES_PATTERN = /@keyframes\s+([\w-]+)/g

/**
 * Custom properties with the given prefix dereferenced via `var(...)` in
 * declaration values, fallback or not. Escaped selector text never matches —
 * the `(` there is backslash-escaped — so only real dereferences count. Known
 * parser artifacts (see `KNOWN_PARSER_ARTIFACT_PROPERTIES` below) are excluded
 * so callers counting `.size` for a vacuous-pass guard see zero real
 * references rather than a phantom one.
 */
export function referencedCustomProperties(css: string, prefix: string): Set<string> {
  const out = new Set<string>()
  for (const match of css.matchAll(VAR_REFERENCE_PATTERN)) {
    const name = match[1] as string
    if (name.startsWith(prefix) && !KNOWN_PARSER_ARTIFACT_PROPERTIES.has(name)) {
      out.add(name)
    }
  }
  return out
}

/**
 * Property names that are real regex matches but never real unresolved
 * custom properties — known oxide scanner artifacts, not gate-worthy
 * findings. `--stext-` (no suffix) is oxide extracting a doc-comment literal
 * in mycelium sources, not a real declaration; removal tracked in #38457.
 * Folded in here (INFRA-3599) so the three compat gates share one exception
 * instead of it living only in apps/web's caller — the exact per-gate
 * divergence the INFRA-3296 consolidation was meant to eliminate.
 *
 * There is no single shared collector every reference-reading helper routes
 * through — `referencedCustomProperties` (above) and `referencedWithoutFallback`
 * (below) each scan `VAR_REFERENCE_PATTERN` independently because they keep
 * different subsets (fallback-carrying references included vs. excluded).
 * Both filter this set themselves, at their own lowest level, rather than
 * leaving it to a caller to filter afterward — that caller-side re-filtering
 * is what let this bug resurface twice (INFRA-3599): a new helper built
 * directly on `referencedWithoutFallback` would have silently reinherited the
 * phantom `--stext-` match if the filter still lived only in
 * `unresolvedCustomProperties`. Any future helper reading `VAR_REFERENCE_PATTERN`
 * matches must apply this filter itself, not assume an existing caller already did.
 */
const KNOWN_PARSER_ARTIFACT_PROPERTIES: ReadonlySet<string> = new Set(['--stext-'])

/**
 * The subset of references that carry NO fallback — the only ones that can
 * resolve to nothing. A property referenced somewhere without a fallback
 * still needs a definition even if another reference carries one. Known
 * parser artifacts (see `KNOWN_PARSER_ARTIFACT_PROPERTIES` above) are
 * excluded here directly, at this function's own lowest level, so every
 * caller built on this helper (currently `unresolvedCustomProperties`)
 * inherits the exclusion for free instead of having to re-apply it.
 */
function referencedWithoutFallback(css: string, prefix: string): Set<string> {
  const out = new Set<string>()
  for (const match of css.matchAll(VAR_REFERENCE_PATTERN)) {
    const name = match[1] as string
    if (name.startsWith(prefix) && match[2] === undefined && !KNOWN_PARSER_ARTIFACT_PROPERTIES.has(name)) {
      out.add(name)
    }
  }
  return out
}

/**
 * Custom properties with the given prefix that a declaration gives a value
 * (`--x: value`). Escaped selector text never matches — the `:` there is
 * backslash-escaped.
 */
export function definedCustomProperties(css: string, prefix: string): Set<string> {
  const out = new Set<string>()
  for (const match of css.matchAll(DECLARATION_PATTERN)) {
    const name = match[1] as string
    if (name.startsWith(prefix)) {
      out.add(name)
    }
  }
  return out
}

/** Whether the stylesheet declares `@keyframes <name>`. */
export function declaresKeyframes(css: string, name: string): boolean {
  for (const match of css.matchAll(KEYFRAMES_PATTERN)) {
    if (match[1] === name) {
      return true
    }
  }
  return false
}

/**
 * The prefixed custom properties the stylesheet dereferences (without a
 * fallback) but neither defines nor receives at runtime — i.e. the ones that
 * resolve to nothing and ship silently unstyled rules. Known parser artifacts
 * are already excluded by `referencedWithoutFallback`, so this only needs to
 * filter definitions and runtime-assigned properties.
 */
export function unresolvedCustomProperties(css: string, prefix: string): string[] {
  const defined = definedCustomProperties(css, prefix)
  return [...referencedWithoutFallback(css, prefix)]
    .filter((name) => !defined.has(name) && !RUNTIME_ASSIGNED_PROPERTIES.has(name))
    .sort()
}
