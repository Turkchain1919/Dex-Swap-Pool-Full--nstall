/**
 * The var-indirection lane of the deterministic compat emission contract
 * (INFRA-3217, generalized across variants per the round-2 CSS ruling): a
 * value whose Tailwind class is OUTSIDE the closed, pregenerated class set
 * (`packages/mycelium/compat-classes.gen.txt`) cannot rely on that class
 * existing in the served CSS. Instead of shipping a dead class, the compiler
 * swaps it for a safelisted VAR-INDIRECTION twin — the same utility (or an
 * arbitrary property) reading a `--c*` custom property — and ships only the
 * VALUE as an inline custom property. Custom properties on the style
 * attribute don't participate in the styled property's cascade, so the
 * swapped class conflicts, merges, and loses to later pools and variant
 * classes exactly like the class the legacy compiler emitted.
 *
 * VARIANT twins: the twin class is static and safelisted per variant prefix
 * (`media-md¦hover¦gap-⟦var(--cEh-gap)⟧` — twin examples in this module's
 * comments are encoded like `emitted-classes.ts` fixtures, because oxide
 * lifts candidate-shaped literals out of comments and the native scan must
 * only ever see twins through the safelist); the custom property is set inline
 * unconditionally and only CONSUMED under the variant, so any value — token
 * or runtime-computed — is expressible under every reachable variant prefix.
 * Each prefix owns its own custom-property namespace (`--c<prefix-code>-*`),
 * so a variant twin can never read a base value and vice versa (the
 * cross-tier collision proof in closed-set.test.ts pins this). This lane is
 * web-only: native resolves BASE-tier out-of-set values into RN style objects
 * at emission (`native-style.ts`); variant-scoped ones have no native
 * resolution path and produce nothing — a separately-ledgered gap.
 *
 * NAMING: the custom-property names are deliberately SHORT (`--cEh-gap`, not
 * `--compat-media-md-hover-gap`). Holding the shipped property set constant,
 * descriptive names measure +2.4% gzip (INFRA-3217 round-3 review) — the
 * earlier 347 KB figure conflated naming with the full property long tail
 * and does not isolate naming. Short names are a debuggability tradeoff
 * bought for that ~2.4%, kept per the reviewer's call; closed-set.test.ts
 * gates the length.
 */
import { decodeArbitraryValue } from './decode-arbitrary-value'
import { cssPropertyName, LONG_TAIL_STYLE_PROPS } from './style-props'
import { NAMED_GROUP_TWIN_PROPS, NAMED_GROUP_TWIN_UTILITIES, VARIANT_TWIN_PROPS } from './twin-tiers'
import { compatVarProp, REACHABLE_VARIANT_PREFIXES, variantPrefixCode } from './variant-codes'

// Re-export the imported twin-tier data (extracted for the max-lines lint) so consumers are unchanged.
export { NAMED_GROUP_TWIN_PROPS, NAMED_GROUP_TWIN_UTILITIES, VARIANT_TWIN_PROPS }
export { compatVarProp, REACHABLE_VARIANT_PREFIXES, variantPrefixCode } from './variant-codes'

/** One converted class: the safelisted var-indirection twin + its inline custom property. */
export interface InlineStyleConversion {
  /** The safelisted class reading the custom property (`min-w-⟦var(--c-min-w)⟧`), variant prefix included. */
  varClass: string
  /** The `--c*` custom property carrying the value. */
  varProp: string
  /** The decoded CSS value. */
  value: string
}

// ── Twin utilities ─────────────────────────────────────────────────────

/**
 * Bracketed-value utility prefixes the compilers emit. `text` and `bg` need
 * explicit data-type hints on their var twins (an untyped `var()` arbitrary
 * value is ambiguous between color/length/image for those utilities); the
 * border side utilities take the `length:` hint so the twin stays a
 * border-WIDTH utility (Tailwind's width form also sets the side's
 * border-style, like the class it replaces).
 */
const UTILITY_VAR_HINT: Record<string, string> = {
  text: 'length',
  bg: 'color',
  border: 'length',
  'border-t': 'length',
  'border-b': 'length',
  'border-l': 'length',
  'border-r': 'length',
}

export const INLINE_UTILITY_PREFIXES = [
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'w',
  'h',
  'min-w',
  'min-h',
  'max-w',
  'max-h',
  'gap',
  'gap-x',
  'gap-y',
  'top',
  'right',
  'bottom',
  'left',
  'rounded',
  'opacity',
  'z',
  'basis',
  'grow',
  'shrink',
  'text',
  'bg',
  'border',
  'border-t',
  'border-b',
  'border-l',
  'border-r',
] as const

const INLINE_UTILITY_PREFIX_SET: ReadonlySet<string> = new Set(INLINE_UTILITY_PREFIXES)

/** The key of the color-form `border` twin (`border-⟦color¦var(--c-bdc)⟧`) — distinct from the width form. */
const BORDER_COLOR_KEY = 'bdc'

/**
 * Arbitrary-property surfaces the compilers can emit, for the var-indirection
 * twins: the shared + Text long tails plus the bespoke emissions (transforms,
 * shadows, typography metrics, enum fallbacks, the TouchableArea frame's
 * `container-name`). Text's own long-tail extras (`-webkit-line-clamp`,
 * `text-decoration-style`, …) are appended explicitly so this module doesn't
 * import the Text prop tables (which would drag the whole Text token layer
 * into every consumer).
 */
export const ARBITRARY_VAR_PROPS: readonly string[] = [
  ...new Set([
    ...LONG_TAIL_STYLE_PROPS.map(cssPropertyName),
    // Text long-tail extras (text-compat/style-props.ts).
    'font-variant',
    'text-decoration-style',
    '-webkit-box-orient',
    '-webkit-line-clamp',
    // Bespoke emissions.
    'transform',
    'transform-origin',
    'box-shadow',
    'text-shadow',
    '-webkit-backdrop-filter',
    'flex-direction',
    'align-items',
    'align-self',
    'justify-content',
    'flex-wrap',
    'display',
    'position',
    // Flex's `gridArea` (INFRA-3808) — base tier only, deliberately not in
    // VARIANT_TWIN_PROPS (see twin-tiers.ts: the grid surface keeps
    // variant-tier dev-throw semantics).
    'grid-area',
    'text-align',
    'text-transform',
    'white-space',
    'text-overflow',
    'overflow',
    'line-height',
    'font-weight',
    'font-family',
    'font-style',
    'letter-spacing',
    'color',
    'background-color',
    'border-color',
    'container-name',
    'word-wrap',
    'word-break',
    'text-decoration-line',
    'text-decoration-color',
  ]),
]

/**
 * Short var-name keys. Utilities keep their own (already short) names; CSS
 * property names abbreviate deterministically — first letters of the
 * hyphen-separated segments, lengthening on collision — over a canonical
 * assignment order (utilities first, then `ARBITRARY_VAR_PROPS` in array
 * order). Assignment order is part of the contract: the generated safelist
 * pins the result byte-for-byte, and the length gate in closed-set.test.ts
 * keeps every key ≤ 8 chars (short names are load-bearing, see module docs).
 */
function buildPropertyKeys(): ReadonlyMap<string, string> {
  const taken = new Set<string>([...INLINE_UTILITY_PREFIXES, BORDER_COLOR_KEY])
  const keys = new Map<string, string>()
  for (const prop of ARBITRARY_VAR_PROPS) {
    const segments = prop.replace(/^-/, '').split('-')
    let key: string | undefined
    for (let len = 1; len <= 8 && key === undefined; len++) {
      const candidate = segments.map((segment) => segment.slice(0, len)).join('')
      if (!taken.has(candidate) && candidate.length <= 8) {
        key = candidate
      }
    }
    if (key === undefined) {
      throw new Error(`compat: no short twin key derivable for "${prop}"`)
    }
    taken.add(key)
    keys.set(prop, key)
  }
  return keys
}

const PROPERTY_TWIN_KEY: ReadonlyMap<string, string> = buildPropertyKeys()

const VARIANT_TWIN_PROP_SET: ReadonlySet<string> = new Set(VARIANT_TWIN_PROPS)

const NAMED_GROUP_TWIN_PROP_SET: ReadonlySet<string> = new Set(NAMED_GROUP_TWIN_PROPS)

const NAMED_GROUP_TWIN_UTILITY_SET: ReadonlySet<string> = new Set(NAMED_GROUP_TWIN_UTILITIES)

/**
 * A registered named group prefix (`group-hover/item`) — the only prefix
 * shape carrying a `/`. Named group states never compose with other
 * variants, so a single test covers the whole composed prefix.
 */
function isNamedGroupPrefix(prefix: string): boolean {
  return prefix.includes('/')
}

/** The arbitrary-property twin surface of a prefix's tier. */
function tierProps(prefix: string): readonly string[] {
  if (prefix === '') {
    return ARBITRARY_VAR_PROPS
  }
  return isNamedGroupPrefix(prefix) ? NAMED_GROUP_TWIN_PROPS : VARIANT_TWIN_PROPS
}

/** The bracketed-value utility twin surface of a prefix's tier. */
function tierUtilities(prefix: string): readonly string[] {
  return isNamedGroupPrefix(prefix) ? NAMED_GROUP_TWIN_UTILITIES : INLINE_UTILITY_PREFIXES
}

/** Whether a utility twin exists under this prefix (`''` = base, always). */
function utilityInTier(util: string, prefix: string): boolean {
  return prefix === '' || !isNamedGroupPrefix(prefix) || NAMED_GROUP_TWIN_UTILITY_SET.has(util)
}

/** The var twin of a bracketed-value utility under a variant prefix (`''` = base). */
export function utilityVarClass(util: string, prefix = ''): string {
  const code = variantPrefixCode(prefix)
  if (code === undefined) {
    throw new Error(`compat: no twin namespace for variant prefix "${prefix}"`)
  }
  const hint = UTILITY_VAR_HINT[util]
  const variant = prefix === '' ? '' : `${prefix}:`
  const varProp = compatVarProp(code, util)
  return hint === undefined ? `${variant}${util}-[var(${varProp})]` : `${variant}${util}-[${hint}:var(${varProp})]`
}

/** The color-form var twin of the `border` utility (raw border colors compile to `border-[<color>]`). */
export function borderColorVarClass(prefix = ''): string {
  const code = variantPrefixCode(prefix)
  if (code === undefined) {
    throw new Error(`compat: no twin namespace for variant prefix "${prefix}"`)
  }
  const variant = prefix === '' ? '' : `${prefix}:`
  return `${variant}border-[color:var(${compatVarProp(code, BORDER_COLOR_KEY)})]`
}

/** The var twin of an arbitrary property under a variant prefix (`''` = base). */
export function arbitraryPropertyVarClass(prop: string, prefix = ''): string {
  const code = variantPrefixCode(prefix)
  const key = PROPERTY_TWIN_KEY.get(prop)
  if (code === undefined || key === undefined) {
    throw new Error(`compat: no twin for property "${prop}" under prefix "${prefix}"`)
  }
  const variant = prefix === '' ? '' : `${prefix}:`
  return `${variant}[${prop}:var(${compatVarProp(code, key)})]`
}

/**
 * Every var-indirection twin of one variant prefix — the safelist's twin
 * matrix row: all bracketed-value utilities and the full arbitrary long tail
 * on the base tier, all utilities + the curated property set under variants,
 * and the narrower curated row under registered named group prefixes
 * (INFRA-3481). Every tier carries the color-form border twin (its `border`
 * utility is in every tier).
 */
export function varIndirectionClasses(prefix = ''): string[] {
  return [
    ...tierUtilities(prefix).map((util) => utilityVarClass(util, prefix)),
    borderColorVarClass(prefix),
    ...tierProps(prefix).map((prop) => arbitraryPropertyVarClass(prop, prefix)),
  ]
}

/** Every (prefix, key) pair of the twin matrix — for the injectivity/short-name gates. */
export function twinVarNames(): Map<string, { prefix: string; key: string }> {
  const names = new Map<string, { prefix: string; key: string }>()
  for (const prefix of ['', ...REACHABLE_VARIANT_PREFIXES]) {
    const code = variantPrefixCode(prefix) as string
    const keys = [
      ...tierUtilities(prefix),
      BORDER_COLOR_KEY,
      ...tierProps(prefix).map((prop) => PROPERTY_TWIN_KEY.get(prop) as string),
    ]
    for (const key of keys) {
      names.set(compatVarProp(code, key), { prefix, key })
    }
  }
  return names
}

import {
  ENUM_DECLARATION,
  ENUM_UTILITY_VALUE,
  SEMANTIC_COLOR_SUFFIXES,
  semanticColorValue,
  THEMED_TABLES,
} from './twin-tables'

// ── Value decoding (extracted to decode-arbitrary-value.ts, round 5) ──

// oxlint-disable-next-line security/detect-unsafe-regex -- anchored, no quantifier overlap, ReDoS-safe
const LENGTH_VALUE = /^\d+(?:\.\d+)?(?:px|em|rem)$/

export { decodeArbitraryValue } from './decode-arbitrary-value'

// ── Conversion ─────────────────────────────────────────────────────────

/** A themed `dark:` sibling class made redundant by its auto-switching twin — skip it entirely. */
export const DROP_CLASS = Symbol('compat.drop')

function twin({
  kind,
  prefix,
  code,
  value,
  twinProps,
}: {
  kind: 'bg' | 'border' | 'outline'
  prefix: string
  code: string
  value: string
  twinProps: ReadonlySet<string>
}): InlineStyleConversion | undefined {
  if (kind === 'outline') {
    // Arbitrary-PROPERTY twin — variant-gated on the twin-prop set like
    // every conversion path (round-3 item 4); bg/border ride utility twins,
    // which the matrix carries under every prefix.
    if (prefix !== '' && !twinProps.has('outline-color')) {
      return undefined
    }
    return {
      varClass: arbitraryPropertyVarClass('outline-color', prefix),
      varProp: compatVarProp(code, PROPERTY_TWIN_KEY.get('outline-color') as string),
      value,
    }
  }
  if (kind === 'border') {
    if (!utilityInTier('border', prefix)) {
      return undefined
    }
    return { varClass: borderColorVarClass(prefix), varProp: compatVarProp(code, BORDER_COLOR_KEY), value }
  }
  if (!utilityInTier('bg', prefix)) {
    return undefined
  }
  return { varClass: utilityVarClass('bg', prefix), varProp: compatVarProp(code, 'bg'), value }
}

/**
 * Convert one compiler-emitted out-of-set class under a variant prefix (`''`
 * = base) to its var-indirection twin. Returns `DROP_CLASS` for themed
 * `dark:` siblings (redundant next to the auto-switching twin), and
 * undefined when there is no twin: named group prefixes whose name is not in
 * `REGISTERED_GROUP_NAMES` (name-parameterized, the documented open set) and
 * class shapes the compilers never emit (compiler / closed-set drift) — the
 * caller dev-throws / prod-warns.
 *
 * `twinProps` is injectable ONLY so closed-set.test.ts can pin each variant
 * gate honestly (a prop outside the set must convert to undefined under a
 * non-empty prefix); production callers never pass it. When omitted, it
 * defaults to the prefix's tier: the curated variant set, or the narrower
 * named-group set under registered named group prefixes (INFRA-3481).
 */
// oxlint-disable-next-line max-params -- the third param is test-only injection (see docblock); the two production params keep their positional shape
export function classToInlineStyle(
  cls: string,
  prefix = '',
  twinProps?: ReadonlySet<string>,
): InlineStyleConversion | typeof DROP_CLASS | undefined {
  const code = variantPrefixCode(prefix)
  if (code === undefined) {
    return undefined
  }
  const propSet = twinProps ?? (isNamedGroupPrefix(prefix) ? NAMED_GROUP_TWIN_PROP_SET : VARIANT_TWIN_PROP_SET)
  if (THEMED_TABLES.drop.has(cls)) {
    return DROP_CLASS
  }
  const themed = THEMED_TABLES.rewrite.get(cls)
  if (themed !== undefined) {
    return twin({ kind: themed.kind, prefix, code, value: themed.value, twinProps: propSet })
  }
  // Semantic color utilities (`bg-surface2`) ride the auto-switching theme vars.
  for (const utilityPrefix of ['bg', 'border'] as const) {
    if (cls.startsWith(`${utilityPrefix}-`) && SEMANTIC_COLOR_SUFFIXES.has(cls.slice(utilityPrefix.length + 1))) {
      return twin({
        kind: utilityPrefix,
        prefix,
        code,
        value: semanticColorValue(cls.slice(utilityPrefix.length + 1)),
        twinProps: propSet,
      })
    }
  }
  // Enum utilities (`flex-row`, `items-center`, `overflow-hidden`, …) —
  // variant-gated on the tier's prop set exactly like the arbitrary-property
  // path below, so no path can return a twin the safelist doesn't carry
  // (round-3 item 4; closed-set.test.ts pins the invariant both ways).
  const enumDecl = ENUM_DECLARATION.get(cls)
  if (enumDecl !== undefined && PROPERTY_TWIN_KEY.has(enumDecl.prop) && (prefix === '' || propSet.has(enumDecl.prop))) {
    return {
      varClass: arbitraryPropertyVarClass(enumDecl.prop, prefix),
      varProp: compatVarProp(code, PROPERTY_TWIN_KEY.get(enumDecl.prop) as string),
      value: enumDecl.value,
    }
  }
  const enumUtility = ENUM_UTILITY_VALUE.get(cls)
  if (enumUtility !== undefined && utilityInTier(enumUtility.util, prefix)) {
    return {
      varClass: utilityVarClass(enumUtility.util, prefix),
      varProp: compatVarProp(code, enumUtility.util),
      value: enumUtility.value,
    }
  }
  // Arbitrary property: [prop:value]
  const property = /^\[([a-zA-Z-]+):(.*)\]$/.exec(cls)
  if (property !== null) {
    const [, prop, rawValue] = property as unknown as [string, string, string]
    const key = PROPERTY_TWIN_KEY.get(prop)
    if (key === undefined || (prefix !== '' && !propSet.has(prop))) {
      return undefined
    }
    return {
      varClass: arbitraryPropertyVarClass(prop, prefix),
      varProp: compatVarProp(code, key),
      value: decodeArbitraryValue(rawValue),
    }
  }
  // Bracketed-value utility: util-[value]
  const utility = /^([a-z-]+)-\[(.*)\]$/.exec(cls)
  if (utility === null) {
    return undefined
  }
  const [, util, rawValue] = utility as unknown as [string, string, string]
  if (!INLINE_UTILITY_PREFIX_SET.has(util) || !utilityInTier(util, prefix)) {
    return undefined
  }
  const value = decodeArbitraryValue(rawValue)
  // The bare `border` utility is width-or-color by value shape (mirroring the
  // compiler: `borderWidth` emits lengths, raw `borderColor` emits colors).
  if (util === 'border' && !LENGTH_VALUE.test(value)) {
    return twin({ kind: 'border', prefix, code, value, twinProps: propSet })
  }
  return { varClass: utilityVarClass(util, prefix), varProp: compatVarProp(code, util), value }
}
