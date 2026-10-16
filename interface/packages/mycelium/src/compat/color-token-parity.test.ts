import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { Scanner } from '@tailwindcss/oxide'
import { describe, expect, it } from 'vitest'
import { FRAME_JOINED_CELLS, TEXT_JOINED_CELLS } from '../button-compat/variantEmphasisHash'
import { CHECKBOX_COMPAT_CLASS_UNIVERSE } from '../checkbox-compat/compile'
import { COLOR_TOKEN_CLASS, THEMED_COLOR_TOKEN_CLASSES } from './tokens'

/**
 * Compat-emittable color-token parity gate (INFRA-3255 ruling, option 4).
 *
 * Every `--color-*` custom property a compat compiler can emit a semantic
 * utility for must exist in BOTH platform bundles. The defect class this
 * catches: a token present on web but deliberately or accidentally absent
 * from the native token stylesheet resolves to NO value on device — uniwind
 * skips the class in silence, so the first symptom is an invisible control
 * on hardware (the default ButtonCompat shipped exactly this).
 *
 * Emittable set — derived by importing the real tables, never transcribed
 * (a hand-copied matrix mirrors the subject instead of testing it):
 *   - `COLOR_TOKEN_CLASS` + `THEMED_COLOR_TOKEN_CLASSES` — everything the
 *     shared `colorClasses`/`outlineColorClasses` compilers can reach.
 *   - `FRAME_JOINED_CELLS` + `TEXT_JOINED_CELLS` — the ButtonCompat cells
 *     (this is where the accent3 alias hid), read from the joined literal
 *     tables because the INFRA-3230 decomposition made the scoped tables
 *     `ScopedCell` objects; the joined strings are the proven superset
 *     (`web-css-coverage.test.ts` set-compares the two).
 *   - `CHECKBOX_COMPAT_CLASS_UNIVERSE` — the checkbox pair's closed set.
 *
 * Bundles: web = css/theme.css `@theme` ∪ css/variables.css `@theme inline`;
 * native = css/theme.css `@theme` ∪ native.css `@theme inline` (native.css
 * imports only theme.css). Crediting theme.css `@theme` to native is verified
 * empirically, not assumed — by the committed probe suite at
 * packages/tailwind/src/parity/token-crediting/native-parity.test.ts
 * (`bun nx run '@universe/tailwind:test:native'`), which drives uniwind's own
 * pipeline (compileNativeCSS + a hydrated UniwindStore):
 * `bg-surface1-hovered-dark`, whose token exists ONLY in theme.css `@theme`,
 * gets a native stylesheet entry and resolves to its declared literal, while
 * `bg-accent3` (variables.css `@theme inline`, web-only) gets none.
 * `white`/`black`/`transparent` come from Tailwind's default theme, which
 * every consumer imports on both platforms (`@import "tailwindcss"`), so they
 * are allowed as builtins.
 *
 * Two escape hatches closed by INFRA-3298: the prefix allowlist covers the
 * FULL color-utility namespace set (an unlisted prefix carrying a Spore token
 * fails the prefix-totality test instead of dropping silently), and literal
 * `className` strings in mycelium sources — which no table tracks — feed the
 * same both-bundles check through the real oxide scanner (the scan leg at the
 * bottom of this file).
 *
 * Deliberately OUT of scope: the `--stext-*` text-color lane (its native gap
 * is a different mechanism and ticket), scanner visibility of the class
 * literals themselves (safelist territory) — this gate is about the token
 * layer only: given that a rule is emitted, does its backing custom property
 * exist on both platforms? — and the vars declared ONLY in the web bundle by
 * design (the deprecated `accent3` aliases and the shadcn `accent` pair in
 * variables.css), which are not part of the cross-platform Spore token layer
 * this gate pins.
 */

/* ------------------------- emittable color suffixes ------------------------ */

/**
 * EVERY Tailwind v4 utility namespace that can carry a color token — not just
 * the ones the tables happen to use today (INFRA-3298: the old five-prefix
 * allowlist silently dropped `ring-`/`fill-`/`stroke-`/gradient-stop
 * utilities, so a token reachable only through one of those never fed the
 * totality test). Sorted longest-first at match time so compound namespaces
 * (`inset-ring-`, `text-shadow-`) never mis-split as their shorter siblings.
 */
const COLOR_UTILITY_PREFIXES = [
  'accent',
  'bg',
  'border',
  'caret',
  'decoration',
  'divide',
  'fill',
  'from',
  'inset-ring',
  'inset-shadow',
  'outline',
  'placeholder',
  'ring',
  'ring-offset',
  'shadow',
  'stroke',
  'text',
  'text-shadow',
  'to',
  'via',
] as const

const PREFIXES_LONGEST_FIRST = [...COLOR_UTILITY_PREFIXES].sort((a, b) => b.length - a.length)

/**
 * Named non-color suffixes reachable through the imported tables under the
 * color-utility prefixes above (typography scale utilities). Everything else
 * non-numeric MUST classify as a color token — unknown suffixes fail the
 * totality test below rather than silently passing.
 */
const NON_COLOR_SUFFIXES = new Set(['subheading-2'])

/** Border widths and outline widths: a numeric tail, optionally side-scoped. */
function isWidthSuffix(suffix: string): boolean {
  return /^(?:[trblxyse]-)?\d/.test(suffix)
}

/**
 * The bare utility of a candidate: variants stripped BEFORE the
 * arbitrary-value guard — a bracketed variant (`data-[state=checked]:bg-accent1`)
 * must not hide the token-backed utility behind it; only the bare utility's
 * own arbitrary value (`bg-[#fff]`, `bg-[var(--x)]`) carries no token to
 * check. An opacity modifier (`/50`) is not part of the token.
 */
function bareUtilityOf(candidate: string): string | undefined {
  const utility = candidate.split(':').pop() ?? ''
  if (utility.includes('[') || utility.startsWith('-')) {
    return undefined
  }
  return utility.split('/')[0]
}

/** Color-token suffixes referenced by a compat class string (variants stripped). */
function colorSuffixesOf(classString: string): string[] {
  const out: string[] = []
  for (const candidate of classString.split(/\s+/)) {
    if (!candidate) {
      continue
    }
    const utility = bareUtilityOf(candidate)
    if (utility === undefined) {
      continue
    }
    for (const prefix of PREFIXES_LONGEST_FIRST) {
      if (utility.startsWith(`${prefix}-`)) {
        const suffix = utility.slice(prefix.length + 1)
        if (!isWidthSuffix(suffix) && !NON_COLOR_SUFFIXES.has(suffix)) {
          out.push(suffix)
        }
        break
      }
    }
  }
  return out
}

/** Every class string reachable through the imported component tables. */
const TRACKED_TABLE_STRINGS: readonly string[] = [
  ...Object.values(FRAME_JOINED_CELLS).flatMap((row) => Object.values(row)),
  ...Object.values(TEXT_JOINED_CELLS).flatMap((row) => Object.values(row)),
  ...CHECKBOX_COMPAT_CLASS_UNIVERSE,
]

function emittableColorSuffixes(): Set<string> {
  const suffixes = new Set<string>()
  // The shared color compilers: every reachable semantic + themed suffix.
  for (const suffix of Object.values(COLOR_TOKEN_CLASS)) {
    suffixes.add(suffix)
  }
  for (const themed of Object.values(THEMED_COLOR_TOKEN_CLASSES)) {
    suffixes.add(themed.light)
    suffixes.add(themed.dark)
  }
  for (const classString of TRACKED_TABLE_STRINGS) {
    for (const suffix of colorSuffixesOf(classString)) {
      suffixes.add(suffix)
    }
  }
  return suffixes
}

/* ------------------------------ bundle parsing ----------------------------- */

const require = createRequire(import.meta.url)
const tailwindPkgRoot = dirname(require.resolve('@universe/tailwind/tailwind'))
const themeCss = readFileSync(require.resolve('@universe/tailwind/theme'), 'utf8')
const variablesCss = readFileSync(join(tailwindPkgRoot, 'css', 'variables.css'), 'utf8')
const nativeCss = readFileSync(require.resolve('@universe/tailwind/native'), 'utf8')

/**
 * Commented-out declarations must never count as declared — commenting a
 * token out with an explanation is exactly how these stylesheets document
 * deliberate omissions. Stripping first also keeps braces inside comments
 * from corrupting the block parser.
 */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Bodies of every match of a single-depth block. Same fail-loud contract as
 * packages/tailwind/src/tokens.parity.test.ts: a nested rule would truncate
 * the body and let the parity check pass on incomplete data, so it throws.
 */
function blockBodies(css: string, opener: RegExp): string[] {
  const bodies: string[] = []
  for (const match of css.matchAll(new RegExp(opener.source, 'g'))) {
    const start = match.index + match[0].length
    const end = css.indexOf('}', start)
    const body = css.slice(start, end)
    if (body.includes('{')) {
      throw new Error(`blockBodies: nested braces under ${opener} — extend the parser to handle nested rules`)
    }
    bodies.push(body)
  }
  if (bodies.length === 0) {
    throw new Error(`blockBodies: no block matched ${opener}`)
  }
  return bodies
}

/** `--color-x` declarations in the matched blocks → bare suffix `x`. */
function declaredColorTokens(css: string, opener: RegExp): Set<string> {
  const tokens = new Set<string>()
  for (const body of blockBodies(stripCssComments(css), opener)) {
    for (const match of body.matchAll(/--color-([\w-]+)\s*:/g)) {
      tokens.add(match[1] as string)
    }
  }
  return tokens
}

const paletteTokens = declaredColorTokens(themeCss, /@theme\s*\{/)
const webTokens = new Set([...paletteTokens, ...declaredColorTokens(variablesCss, /@theme\s+inline\s*\{/)])
const nativeTokens = new Set([...paletteTokens, ...declaredColorTokens(nativeCss, /@theme\s+inline\s*\{/)])

/** Tailwind's default theme ships these on web and native alike. */
const BUILTIN_TOKENS = new Set(['white', 'black', 'transparent'])

/* -------------- unlisted-prefix guard + literal source scan ---------------- */

/**
 * Web-declared color tokens deliberately OUTSIDE the cross-platform Spore
 * layer: the shadcn/ui compatibility set and the deprecated `accent3` alias
 * (see the bundle canary above and the INFRA-3298 docstring up top). This is
 * a reviewed, closed list — NOT `webTokens \ nativeTokens` computed live,
 * which would silently re-absorb any FUTURE native-parity defect the moment
 * one appeared (the exact vacuousness this list exists to prevent — see the
 * "classification is total" defect class this gate was built to catch). A
 * token that lands in variables.css but not native.css and is NOT named here
 * flows into `sporeColorTokens` below and fails the native-bundle scan check
 * loudly instead of disappearing. Extend this list only for another
 * confirmed by-design web-only var; never to silence a real gap.
 */
const WEB_ONLY_EXCLUDED_TOKENS: ReadonlySet<string> = new Set([
  'accent',
  'accent-foreground',
  'accent3',
  'accent3-hovered',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-ring',
])

/**
 * Builds the classification vocabulary from its inputs — factored out (rather
 * than inlined into the `sporeColorTokens` const below) so the composition
 * itself is unit-testable with synthetic sets, independent of today's real
 * CSS having no live example of the defect class it must catch (see the
 * canary test below).
 */
function buildSporeColorTokens(
  native: ReadonlySet<string>,
  web: ReadonlySet<string>,
  excluded: ReadonlySet<string>,
  tableTokens: readonly string[],
): Set<string> {
  return new Set([...native, ...web, ...tableTokens].filter((token) => !excluded.has(token)))
}

/**
 * The cross-platform Spore color-token layer this gate is scoped to: the
 * shared palette, everything either bundle declares, and every suffix the
 * compat color tables can emit — MINUS the reviewed web-only exclusions
 * above. Including the full web set (not just `nativeTokens`) is the
 * INFRA-3599 fix: the old vocabulary was `paletteTokens ∪ nativeTokens ∪
 * tables`, which by construction can never contain a token missing from
 * native — making the literal-scan leg below vacuous for exactly the defect
 * class it exists to catch (a token present on web but absent from native).
 */
const sporeColorTokens: ReadonlySet<string> = buildSporeColorTokens(nativeTokens, webTokens, WEB_ONLY_EXCLUDED_TOKENS, [
  ...Object.values(COLOR_TOKEN_CLASS),
  ...Object.values(THEMED_COLOR_TOKEN_CLASSES).flatMap((themed) => [themed.light, themed.dark]),
])
const sporeTokensLongestFirst = [...sporeColorTokens].sort((a, b) => b.length - a.length)

/**
 * The Spore token a candidate's utility is backed by, REGARDLESS of prefix —
 * this is what makes an unlisted color-utility prefix loud instead of
 * invisible: prefix-allowlist extraction can only miss, tail-matching the
 * token vocabulary cannot. `vocabulary` defaults to the real classification
 * set; a test may pass a synthetic one to prove the matching logic itself
 * without needing a genuinely broken bundle on disk.
 */
function sporeTokenTailOf(
  candidate: string,
  vocabulary: ReadonlySet<string> = sporeColorTokens,
): { prefix: string; token: string } | undefined {
  const utility = bareUtilityOf(candidate)
  if (utility === undefined) {
    return undefined
  }
  const longestFirst =
    vocabulary === sporeColorTokens ? sporeTokensLongestFirst : [...vocabulary].sort((a, b) => b.length - a.length)
  for (const token of longestFirst) {
    if (utility.length > token.length + 1 && utility.endsWith(`-${token}`)) {
      return { prefix: utility.slice(0, utility.length - token.length - 1), token }
    }
  }
  return undefined
}

/**
 * Every candidate the REAL oxide scanner lifts from mycelium's sources — the
 * exact scan surface the consuming apps register via `@source` — minus the
 * test/story files the apps exclude with `@source not`. This is how a literal
 * `className` outside the tracked tables (components/checkbox.tsx was the
 * filed instance) feeds the same token-parity check as the tables.
 */
function scannedCandidates(): string[] {
  const base = join(dirname(new URL(import.meta.url).pathname), '..')
  const scanner = new Scanner({
    sources: [
      { base, pattern: '**/*', negated: false },
      { base, pattern: '**/*.test.*', negated: true },
      { base, pattern: '**/*.stories.*', negated: true },
      { base, pattern: '**/testing/**', negated: true },
    ],
  })
  return scanner.scan()
}

/* ---------------------------------- gate ----------------------------------- */

describe('compat-emittable color tokens exist in both platform bundles', () => {
  const emittable = [...emittableColorSuffixes()].sort()

  // Positive controls: an empty parse on either side must be loud, not green.
  it('parser canaries — the derived sets contain known members', () => {
    expect(emittable).toContain('neutral1')
    expect(emittable).toContain('neutral1-hovered')
    expect(emittable).toContain('surface1-hovered-dark')
    expect(emittable.length).toBeGreaterThanOrEqual(30)
    // A bracketed VARIANT must not hide the token-backed utility behind it;
    // a bracketed VALUE on the bare utility still carries no token.
    expect(colorSuffixesOf('data-[state=checked]:bg-accent1 gap-[1px] hover:bg-[var(--x)]')).toEqual(['accent1'])
    // Colons INSIDE brackets: a bracketed variant's internal colon must not
    // truncate the utility, and a bracketed value's internal colon must not
    // surface a phantom suffix. The last case is pinned deliberately: the
    // colon split leaves `var(--x)]`, which the bracket guard never sees, so
    // the exclusion rests on it matching no tracked prefix — this canary is
    // what keeps that incidental outcome from regressing silently.
    expect(colorSuffixesOf('supports-[display:grid]:bg-accent1')).toEqual(['accent1'])
    expect(colorSuffixesOf('[&:hover]:bg-accent1')).toEqual(['accent1'])
    expect(colorSuffixesOf('bg-[color:var(--x)]')).toEqual([])
    // Stacked variants strip all the way down to the bare utility.
    expect(colorSuffixesOf('dark:hover:bg-accent1')).toEqual(['accent1'])
    // The previously-unlisted color namespaces extract too (INFRA-3298) —
    // these fell through the old five-prefix loop and produced NOTHING.
    expect(colorSuffixesOf('ring-accent1 fill-accent1 from-accent1 hover:stroke-accent1')).toEqual([
      'accent1',
      'accent1',
      'accent1',
      'accent1',
    ])
    // Compound namespaces split at the longest prefix, and an opacity
    // modifier is not part of the token.
    expect(colorSuffixesOf('text-shadow-accent1 bg-accent1/50')).toEqual(['accent1', 'accent1'])
    // Width tails under the newly listed namespaces stay non-color.
    expect(colorSuffixesOf('ring-2 divide-x-2')).toEqual([])
    // The tail-matcher classifies by token vocabulary, not by prefix list.
    expect(sporeTokenTailOf('some-future-utility-accent1')).toEqual({ prefix: 'some-future-utility', token: 'accent1' })
    expect(sporeTokenTailOf('bg-[var(--x)]')).toBeUndefined()
    // Web-only vars (the deprecated accent3 alias family) are outside the
    // Spore token layer, so the tail-matcher must not classify them.
    expect(sporeTokenTailOf('bg-accent3')).toBeUndefined()
    // A commented-out declaration is documentation, not a declaration.
    expect(
      declaredColorTokens('@theme inline { /* --color-ghost: red; */ --color-real: blue; }', /@theme\s+inline\s*\{/),
    ).toEqual(new Set(['real']))
    // The deprecated web-only alias proves each bundle parser reads its own
    // block: present on web, absent on native BY DESIGN (native.css states it
    // twice). Two exits retire these two lines: legacy accent3 being removed,
    // or the aliases reaching the native bundle on purpose (added to
    // native.css, or variables.css imported into it) — that flips this canary
    // without violating the gate's both-bundles invariant.
    expect(webTokens).toContain('accent3')
    expect(nativeTokens).not.toContain('accent3')
  })

  it('classification is total — every emittable suffix is a known token on some platform', () => {
    const unknown = emittable.filter(
      (suffix) => !webTokens.has(suffix) && !nativeTokens.has(suffix) && !BUILTIN_TOKENS.has(suffix),
    )
    // A suffix in NEITHER bundle is either a token missing from both (fix the
    // bundles) or a non-color utility this gate cannot classify (extend
    // NON_COLOR_SUFFIXES / isWidthSuffix) — both need a human, never a pass.
    expect(unknown).toEqual([])
  })

  it('every compat-emittable color token exists in the WEB bundle', () => {
    const missing = emittable.filter((suffix) => !webTokens.has(suffix) && !BUILTIN_TOKENS.has(suffix))
    expect(missing).toEqual([])
  })

  it('every compat-emittable color token exists in the NATIVE bundle', () => {
    const missing = emittable.filter((suffix) => !nativeTokens.has(suffix) && !BUILTIN_TOKENS.has(suffix))
    expect(missing).toEqual([])
  })

  // INFRA-3298 part 1: an unlisted prefix must be LOUD. Extraction alone can
  // only miss (a prefix outside COLOR_UTILITY_PREFIXES produces nothing), so
  // this walks the tables the other way — any utility whose tail names a
  // Spore token but whose prefix is not in the color-utility list is a
  // color-bearing namespace this gate cannot see. Extend the prefix list,
  // never delete the offender.
  it('totality over prefixes — no tracked table carries a Spore token under an unlisted utility prefix', () => {
    const offenders: string[] = []
    for (const classString of TRACKED_TABLE_STRINGS) {
      for (const candidate of classString.split(/\s+/)) {
        if (!candidate) {
          continue
        }
        const utility = bareUtilityOf(candidate)
        if (utility === undefined || sporeTokenTailOf(candidate) === undefined) {
          continue
        }
        if (!PREFIXES_LONGEST_FIRST.some((prefix) => utility.startsWith(`${prefix}-`))) {
          offenders.push(candidate)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  // INFRA-3599: WEB_ONLY_EXCLUDED_TOKENS is a reviewed, hand-maintained list,
  // not a live diff — this canary is what keeps it from silently drifting out
  // of sync with the real bundles. A new token added to variables.css but not
  // native.css fails HERE (extend the exclusion list after confirming it's
  // deliberate) rather than silently vanishing into `sporeColorTokens`, which
  // would reopen the exact vacuousness this list exists to prevent.
  it('WEB_ONLY_EXCLUDED_TOKENS matches the real web/native declaration diff exactly', () => {
    const actualDiff = new Set([...webTokens].filter((token) => !nativeTokens.has(token)))
    expect(actualDiff).toEqual(WEB_ONLY_EXCLUDED_TOKENS)
  })

  // INFRA-3599 canary: proves the literal-scan leg below CAN now detect its
  // target defect class (a token present on web, missing from native, not a
  // reviewed exclusion) — the classification vocabulary previously in place
  // here (paletteTokens ∪ nativeTokens ∪ tables) could never contain such a
  // token, so `sporeTokenTailOf` could never classify it and the both-bundles
  // check a few lines down could never fire for it. There is no live example
  // of this defect in today's bundles (that's the point — it's a defect), so
  // this proves the composition directly with a synthetic vocabulary rather
  // than waiting for a real regression to exercise it.
  it('canary — a hypothetical non-excluded web-only token is classified as a Spore token and would fail the native check', () => {
    const hypotheticalWeb = new Set([...webTokens, 'hypothetical-native-gap'])
    const hypotheticalVocab = buildSporeColorTokens(nativeTokens, hypotheticalWeb, WEB_ONLY_EXCLUDED_TOKENS, [])
    expect(sporeTokenTailOf('bg-hypothetical-native-gap', hypotheticalVocab)).toEqual({
      prefix: 'bg',
      token: 'hypothetical-native-gap',
    })
    // ...and it is indeed absent from the native bundle, which is exactly
    // what makes it a defect the both-bundles check must report.
    expect(nativeTokens.has('hypothetical-native-gap')).toBe(false)
    // A reviewed exclusion, by contrast, must NOT be classified — this is the
    // out-of-scope semantics the exclusion list preserves.
    const hypotheticalExcluded = new Set([...WEB_ONLY_EXCLUDED_TOKENS, 'hypothetical-native-gap'])
    const excludedVocab = buildSporeColorTokens(nativeTokens, hypotheticalWeb, hypotheticalExcluded, [])
    expect(sporeTokenTailOf('bg-hypothetical-native-gap', excludedVocab)).toBeUndefined()
  })
})

/* ------------------------- literal className scan leg ---------------------- */

// INFRA-3298 part 2: the tables are not the only way a token-backed color
// class ships — components/checkbox.tsx carried literal
// `data-[state=checked]:bg-accent1` classes no table tracks. The real oxide
// scanner is the authority on what the consuming apps' builds lift from
// mycelium sources, so its candidate set feeds the same both-bundles check.
describe('literal Spore color classes in mycelium sources exist in both platform bundles', () => {
  const scannedTokens = new Map<string, string>()
  for (const candidate of scannedCandidates()) {
    const tail = sporeTokenTailOf(candidate)
    if (tail !== undefined && !scannedTokens.has(tail.token)) {
      scannedTokens.set(tail.token, candidate)
    }
  }

  it('scanner canaries — the scan sees the untracked literals the gate was missing', () => {
    // The filed instance (components/checkbox.tsx) and a previously-unlisted
    // namespace in live use (ring-, components/tabs.tsx and friends).
    expect(scannedTokens.has('accent1')).toBe(true)
    expect(scannedTokens.has('surface3')).toBe(true)
    expect(scannedTokens.size).toBeGreaterThanOrEqual(20)
  })

  it('every scanned literal Spore color token exists in the WEB bundle', () => {
    const missing = [...scannedTokens].filter(([token]) => !webTokens.has(token) && !BUILTIN_TOKENS.has(token))
    expect(missing).toEqual([])
  })

  it('every scanned literal Spore color token exists in the NATIVE bundle', () => {
    const missing = [...scannedTokens].filter(([token]) => !nativeTokens.has(token) && !BUILTIN_TOKENS.has(token))
    expect(missing).toEqual([])
  })
})
