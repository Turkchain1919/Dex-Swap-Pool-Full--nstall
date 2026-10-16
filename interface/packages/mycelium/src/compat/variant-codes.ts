/**
 * Variant prefix vocabulary for the var-indirection twin matrix
 * (INFRA-3217): the composable variant prefixes the pool orchestration can
 * reach, and their SHORT namespace codes for the `--c<code>-<key>` custom
 * properties (see `inline-style.ts` for why short names are load-bearing).
 */
import { GROUP_STATE_VARIANT, REGISTERED_GROUP_NAMES } from './group'
import { MEDIA_VARIANT } from './media'
import { PSEUDO_VARIANTS } from './pseudo'

// ── Variant prefixes ───────────────────────────────────────────────────

/**
 * Atomic variant → short code. Composition concatenates codes
 * (`media-md:hover` → `Eh`), so codes must keep the concatenation injective:
 * media variants are single uppercase letters, pseudo/theme are single
 * lowercase letters, unnamed group states are `g` + one lowercase letter.
 * Named group variants (`group-hover/<name>`) carry a code only for names in
 * `REGISTERED_GROUP_NAMES` — the group-state code plus the name's letter
 * (`group-hover/item` → `ghi`, INFRA-3481); unregistered names have NO code
 * and are the documented open set. Group states never compose with other
 * variants, so the three-letter named codes cannot collide with any
 * concatenation.
 */
const ATOMIC_VARIANT_CODE: Readonly<Record<string, string>> = {
  hover: 'h',
  active: 'a',
  focus: 'f',
  'focus-visible': 'v',
  'focus-within': 'w',
  'aria-disabled': 'd',
  dark: 'k',
  // `light` keeps the historical `n` code (from its `not-dark` spelling) so the
  // `--cn-*` var namespace and the generated web artifact churn stay minimal.
  light: 'n',
  'media-xxxl': 'A',
  'media-xxl': 'B',
  'media-xl': 'C',
  'media-lg': 'D',
  'media-md': 'E',
  'media-sm': 'F',
  'media-xs': 'G',
  'media-xxs': 'H',
  'media-short': 'I',
  'media-mid-height': 'J',
  'media-lg-height': 'K',
  'group-hover': 'gh',
  'group-active': 'ga',
  'group-focus': 'gf',
  'group-focus-visible': 'gv',
  'group-focus-within': 'gw',
}

const GROUP_STATE_VARIANT_SET: ReadonlySet<string> = new Set<string>(Object.values(GROUP_STATE_VARIANT))

/**
 * A named group segment (`group-hover/item`) → its var-namespace code
 * (`ghi`): the group-state code plus the registered name's letter.
 * Undefined for non-group segments and unregistered names (the open set).
 */
function namedGroupSegmentCode(segment: string): string | undefined {
  const slash = segment.indexOf('/')
  if (slash === -1) {
    return undefined
  }
  const variant = segment.slice(0, slash)
  const name = segment.slice(slash + 1)
  // Own-property guard: group names are caller-supplied strings, so a name
  // like `toString` must stay unregistered instead of resolving through the
  // record's prototype chain.
  const nameCode = Object.hasOwn(REGISTERED_GROUP_NAMES, name) ? REGISTERED_GROUP_NAMES[name] : undefined
  if (!GROUP_STATE_VARIANT_SET.has(variant) || nameCode === undefined) {
    return undefined
  }
  return `${ATOMIC_VARIANT_CODE[variant]}${nameCode}`
}

/**
 * The composed variant prefix → var-namespace code; `''` for the base tier,
 * undefined when any segment has no code (named group variants with an
 * unregistered name — the documented open set, dev-throw / prod
 * keep-and-warn).
 */
export function variantPrefixCode(prefix: string): string | undefined {
  if (prefix === '') {
    return ''
  }
  let code = ''
  for (const segment of prefix.split(':')) {
    const segmentCode = ATOMIC_VARIANT_CODE[segment] ?? namedGroupSegmentCode(segment)
    if (segmentCode === undefined) {
      return undefined
    }
    code += segmentCode
  }
  return code
}

/**
 * The theme-pool variant prefixes, in composition order. Exported because the
 * native-safety filter (`native-safe.ts`, INFRA-3253) has to recognise a theme
 * segment by vocabulary rather than by spelling — a new theme pool must be
 * classified by that filter, not silently pass through it.
 */
export const THEME_VARIANTS = ['dark', 'light'] as const

/**
 * Every variant prefix the pool orchestration (`compose.ts`) can compose,
 * exactly as it composes them: the six pseudo pools, the eleven media pools,
 * their `media:pseudo` composites (`$md={{ hoverStyle }}`), the theme pools
 * and their `theme:pseudo` composites, the unnamed group states, and the
 * registered named group states (INFRA-3481). The
 * themed color pairs' `dark:`-prefixed sibling classes need no composite
 * prefixes here: their light twin rides an auto-switching variable and the
 * sibling is dropped (see `buildThemedTables`). The twin matrix is
 * (this list) × (the twin utilities below): finite by construction, no
 * per-value enumeration.
 */
export const REACHABLE_VARIANT_PREFIXES: readonly string[] = [
  ...PSEUDO_VARIANTS,
  ...Object.values(MEDIA_VARIANT),
  ...Object.values(MEDIA_VARIANT).flatMap((media) => PSEUDO_VARIANTS.map((pseudo) => `${media}:${pseudo}`)),
  ...THEME_VARIANTS,
  ...THEME_VARIANTS.flatMap((theme) => PSEUDO_VARIANTS.map((pseudo) => `${theme}:${pseudo}`)),
  ...Object.values(GROUP_STATE_VARIANT),
  ...Object.values(GROUP_STATE_VARIANT).flatMap((variant) =>
    Object.keys(REGISTERED_GROUP_NAMES).map((name) => `${variant}/${name}`),
  ),
]

/** `--c<prefix-code>-<key>` — the base tier is `--c-<key>`. */
export function compatVarProp(prefixCode: string, key: string): string {
  return `--c${prefixCode}-${key}`
}
