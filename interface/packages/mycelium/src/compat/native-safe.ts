/**
 * Native-safety filter over the generated compat safelist (INFRA-3253).
 *
 * `packages/mycelium/compat-classes.gen.txt` is generated once (INFRA-3217)
 * and is correct for web, where every variant prefix in
 * `REACHABLE_VARIANT_PREFIXES` works. Registering that same file as a uniwind
 * `@source` for `apps/mobile` makes sub-populations of it reachable on
 * React Native that must not be — this module is the RULE that names them, so
 * the native artifact can be derived from the web one instead of maintained
 * beside it. It is a filter, not a second enumeration: it never decides what
 * the compat compilers may emit, only which of those emissions React Native
 * can carry.
 *
 * The three rules, each derived from the vocabulary that produces the tier
 * (`THEME_VARIANTS`, the twin matrix) rather than from a list of class names,
 * so a new theme pool or twin property is classified instead of leaking
 * through:
 *
 * 1. `outer-theme` — a theme segment that is NOT the last variant segment.
 *    uniwind lowers a composed prefix to nested CSS (the leftmost variant
 *    becomes the OUTER rule), and its processor overwrites the inherited
 *    declaration config when it recurses into the nested rule
 *    (`bundler/css-processor/processor.ts`, the `declarationConfig.theme =
 *    theme` assignment inside `parseRuleRec`) instead of merging it. The inner
 *    rule re-declares `theme` as null, so the theme gate that
 *    `core/native/store.ts` checks is gone and the declaration applies in BOTH
 *    themes. Since every one of these entries is a var-indirection twin and
 *    React Native has no style attribute that carries CSS custom properties,
 *    the declaration lands with an undefined value — it does not paint the
 *    wrong theme's value, it OWNS the property and wipes whatever an earlier
 *    class set. Registering the unfiltered safelist introduces that; without
 *    the registration the class is not a stylesheet key and contributes
 *    nothing.
 *
 * 2. `negated-theme` — a theme segment spelled as a `not-` negation. Tailwind
 *    can only invert a variant that reduces to a single negatable selector.
 *    The native entry (`@universe/tailwind/native`) does not reach the
 *    single-selector `dark` custom variant that the web bundle defines, so the
 *    only definition native sees is uniwind's two-branch form (a `:where()`
 *    branch plus a `prefers-color-scheme` media branch), which is not
 *    invertible. Tailwind discards these candidates before uniwind sees them:
 *    they compile to nothing on native at any safelist size, so they are pure
 *    scan cost. Since INFRA-3263 the compiler spells the light pool with the
 *    positive `light` variant instead of `not-dark`, so this rule's census is
 *    ZERO — it is kept as vocabulary armor, so any future `not-` theme
 *    spelling is excluded by construction instead of leaking through.
 *
 * 3. `var-twin` — a member of the var-indirection twin matrix (INFRA-3265).
 *    The `--c*` contract is a WEB contract: a twin class expects its value
 *    from an inline custom property on the DOM style attribute, and React
 *    Native has no style attribute that carries custom properties. The native
 *    compat legs deliberately never emit twins either — BASE-tier out-of-set
 *    values are resolved into RN style objects at emission (`native-style.ts`);
 *    variant-scoped ones have no native resolution path at all and produce
 *    nothing, a pre-existing, separately-ledgered gap — so a
 *    registered twin can only ever OWN its property with an undefined value
 *    and wipe whatever an earlier class set. Twin identity is MEMBERSHIP in
 *    the generated matrix, never a `var(--c` spelling test: classes reading
 *    `var(--color-*)` / `var(--stext-*)` are not twins and must stay. The
 *    theme rules run first so their censuses stay stable for the twins they
 *    already cover.
 *
 * No rule removes any class that produces a defined value on native, so the
 * filtered artifact loses no working coverage.
 */
import { REACHABLE_VARIANT_PREFIXES, varIndirectionClasses } from './inline-style'
import { THEME_VARIANTS } from './variant-codes'

const THEME_VARIANT_SET: ReadonlySet<string> = new Set<string>(THEME_VARIANTS)

/** The whole twin matrix, base tier included — matrix membership IS the var-twin rule. */
const VAR_TWIN_CLASSES: ReadonlySet<string> = new Set(
  ['', ...REACHABLE_VARIANT_PREFIXES].flatMap((prefix) => varIndirectionClasses(prefix)),
)

export const NATIVE_UNSAFE_REASONS = ['outer-theme', 'negated-theme', 'var-twin'] as const

export type NativeUnsafeReason = (typeof NATIVE_UNSAFE_REASONS)[number]

/**
 * Split a Tailwind candidate into its variant segments and trailing utility.
 * Only a `:` at bracket/paren depth zero separates segments — arbitrary values
 * carry their own colons (property-name arbitrary values, arbitrary variants).
 */
export function candidateSegments(candidate: string): { variants: string[]; utility: string } {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of candidate) {
    if (char === '[' || char === '(') {
      depth += 1
    } else if (char === ']' || char === ')') {
      depth -= 1
    } else if (char === ':' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  return { variants: parts.slice(0, -1), utility: parts[parts.length - 1] ?? '' }
}

/** Why this candidate cannot work under uniwind on native, or undefined if it can. */
export function nativeUnsafeReason(candidate: string): NativeUnsafeReason | undefined {
  const { variants } = candidateSegments(candidate)
  for (const [index, variant] of variants.entries()) {
    // A `not-` negation of a theme-vocabulary segment: Tailwind cannot invert
    // uniwind's two-branch theme variants, so the candidate compiles to
    // nothing on native regardless of position. The compiler stopped emitting
    // this spelling in INFRA-3263 (census 0) — kept so any future negation is
    // excluded by construction.
    if (variant.startsWith('not-') && THEME_VARIANT_SET.has(variant.slice('not-'.length))) {
      return 'negated-theme'
    }
    if (!THEME_VARIANT_SET.has(variant)) {
      continue
    }
    if (index < variants.length - 1) {
      return 'outer-theme'
    }
  }
  if (VAR_TWIN_CLASSES.has(candidate)) {
    return 'var-twin'
  }
  return undefined
}

/** The subset of a safelist that React Native can actually carry. */
export function nativeSafeCompatClasses(entries: readonly string[]): string[] {
  return entries.filter((entry) => nativeUnsafeReason(entry) === undefined)
}

/** `reason → count` over a safelist; the shape the drift gates and the PR ledger assert on. */
export function nativeUnsafeCensus(entries: readonly string[]): Record<NativeUnsafeReason, number> {
  const census = Object.fromEntries(NATIVE_UNSAFE_REASONS.map((reason) => [reason, 0])) as Record<
    NativeUnsafeReason,
    number
  >
  for (const entry of entries) {
    const reason = nativeUnsafeReason(entry)
    if (reason !== undefined) {
      census[reason] += 1
    }
  }
  return census
}

/** Safelist file bytes → the class entries, dropping the generated header comments. */
export function parseSafelistFile(contents: string): string[] {
  return contents.split('\n').filter((line) => line.length > 0 && !line.startsWith('/*'))
}

const GENERATED_HEADER = [
  '/* GENERATED by `bun nx run @universe/mycelium:generate:compat-classes:native` — do not edit. */',
  '/* The native-safe subset of compat-classes.gen.txt (INFRA-3253): a rule-derived filter, not a second enumeration. */',
  '/* Registered via @source from apps/mobile/src/global.css; drift-gated by native-safe.test.ts. */',
]

/** The exact bytes of `packages/mycelium/compat-classes.native.gen.txt`, from the web safelist's bytes. */
export function nativeCompatClassesFileContents(safelistContents: string): string {
  return [...GENERATED_HEADER, ...nativeSafeCompatClasses(parseSafelistFile(safelistContents)), ''].join('\n')
}
