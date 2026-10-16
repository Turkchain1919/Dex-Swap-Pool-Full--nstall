/**
 * Pure (React-free) side of the styled() factory: class-universe enumeration
 * and definition-time validation. The parity/emission test gates import from
 * here without pulling React into node-env suites.
 */
import type { ExposedStyledConfig, StyledVariants } from './types'

interface TokenParts {
  /** Leading variant segments, in order (e.g. `dark`, `hover`, `aria-[busy]`). */
  variants: string[]
  /** The final utility segment (may itself be arbitrary `[prop:value]`). */
  utility: string
}

/**
 * Split a class token into variant prefixes + utility at TOP-LEVEL colons
 * (colons inside `[...]` belong to arbitrary values/variants, e.g.
 * `[font-weight:500]` or `aria-[label:x]`), so bans match a variant wherever
 * it sits in the stack (`dark:hover:bg-x` is a hover usage) instead of only
 * at the head of the raw token.
 */
export function splitClassToken(token: string): TokenParts {
  const segments: string[] = []
  let depth = 0
  let current = ''
  for (const char of token) {
    if (char === '[') {
      depth += 1
    } else if (char === ']') {
      depth = Math.max(0, depth - 1)
    }
    if (char === ':' && depth === 0) {
      segments.push(current)
      current = ''
      continue
    }
    current += char
  }
  segments.push(current)
  const utility = segments.pop() ?? ''
  return { variants: segments, utility }
}

/**
 * Class forms KNOWN to be dead or destructive on at least one platform,
 * thrown at definition time (dev) rather than left to render as dead
 * classes. A tripwire for measured failure modes — NOT an exhaustive
 * platform-compatibility model; the build-time emission gates stay the
 * authority on what actually resolves:
 * - `hover:` (and the hover-adjacent `group-*`/`peer-*` state families):
 *   uniwind has no hover/group/peer mechanism on native (measured MISS) —
 *   use the factory's state-driven `hover` lane instead.
 * - `focus-visible:`: no native mechanism (MISS), unlike `focus:`/`active:`
 *   which uniwind drives from component state.
 * - `media-*`: the compat-lane custom variants live in compat.css, which the
 *   native bundle never imports (MISS). Use `max-md:` etc., or declare
 *   `platform: 'web'`.
 * - `aria-*` / `aria-[...]`: variant MISSes natively; forward the real prop.
 * - `focus:outline-*`: RN paints outline props at rest but has no
 *   focus-state CSS lane for them — the pair never applies on device.
 * - `elevation-*`: no utility exists; use the inlineStyle lane.
 * - `shadow-short|medium|large`: self-referential `--shadow-*` in the native
 *   theme — resolving them THROWS on device. Use the inlineStyle lane.
 *
 * Bans marked `webLegal` are native MISSes only; a config that declares
 * `platform: 'web'` (never reaches a native bundle) may use them.
 */
interface TokenBan {
  reason: string
  webLegal: boolean
  matches: (parts: TokenParts) => boolean
}

const BANNED_TOKEN_FORMS: ReadonlyArray<TokenBan> = [
  {
    reason: 'hover: never resolves on native — use the styled() hover lane',
    webLegal: true,
    matches: ({ variants }) => variants.includes('hover'),
  },
  {
    reason: 'group-*/peer-* state variants never resolve on native — lift the state into React context/props',
    webLegal: true,
    matches: ({ variants }) => variants.some((variant) => /^(group|peer)(-|\/|$)/.test(variant)),
  },
  {
    reason: 'focus-visible: never resolves on native — use focus: (state-driven) instead',
    webLegal: true,
    matches: ({ variants }) => variants.includes('focus-visible'),
  },
  {
    reason: 'media-* variants are web-compat-only (compat.css) — use max-md:/max-lg: etc., or declare platform: "web"',
    webLegal: true,
    matches: ({ variants }) => variants.some((variant) => variant.startsWith('media-')),
  },
  {
    reason: 'aria-* variants never resolve on native — forward the real prop instead',
    webLegal: true,
    matches: ({ variants }) => variants.some((variant) => /^aria-(\[|[a-z])/.test(variant)),
  },
  {
    reason: 'focus:outline-* never applies on native (no focus-state lane for RN outline props)',
    webLegal: true,
    matches: ({ variants, utility }) => variants.includes('focus') && utility.startsWith('outline'),
  },
  {
    reason: 'no elevation-* utility exists — use the inlineStyle lane',
    webLegal: false,
    matches: ({ utility }) => utility.startsWith('elevation-'),
  },
  {
    reason: 'spore shadow classes throw on native (self-referential --shadow-*) — use the inlineStyle lane',
    webLegal: false,
    matches: ({ utility }) => /^shadow-(short|medium|large)$/.test(utility),
  },
]

function tokensOf(classes: string | undefined): string[] {
  return classes === undefined ? [] : classes.split(/\s+/).filter(Boolean)
}

/**
 * `collectStyledClasses` walks composed chains through `baseStyledConfig`.
 * The factory only ever links configs it created (an acyclic chain), but the
 * exposed `styledConfig` is a plain mutable object — a hand-mutated cycle or
 * a pathological deep chain must fail loudly, not hang the gates.
 */
const MAX_COMPOSED_DEPTH = 32

function collectInto({
  config,
  tokens,
  seen,
  depth,
}: {
  config: ExposedStyledConfig<StyledVariants>
  tokens: Set<string>
  seen: Set<ExposedStyledConfig<StyledVariants>>
  depth: number
}): void {
  if (seen.has(config)) {
    throw new Error('collectStyledClasses: baseStyledConfig chain contains a cycle')
  }
  if (depth > MAX_COMPOSED_DEPTH) {
    throw new Error(`collectStyledClasses: baseStyledConfig chain exceeds depth ${MAX_COMPOSED_DEPTH}`)
  }
  seen.add(config)
  for (const token of tokensOf(config.base)) {
    tokens.add(token)
  }
  for (const table of Object.values(config.variants ?? {})) {
    for (const branch of Object.values(table)) {
      for (const token of tokensOf(branch)) {
        tokens.add(token)
      }
    }
  }
  for (const rule of [...(config.compoundVariants ?? []), ...(config.hover ?? [])]) {
    for (const token of tokensOf(rule.class)) {
      tokens.add(token)
    }
  }
  if (config.baseStyledConfig !== undefined) {
    collectInto({ config: config.baseStyledConfig, tokens, seen, depth: depth + 1 })
  }
}

/**
 * Every class the component can ever emit, deduplicated: base + every variant
 * branch + compound rules + hover rules — plus, for a factory-composed
 * component (`styled(Inner, …)`), the inner factory's own universe, walked
 * recursively through `baseStyledConfig` (cycle- and depth-guarded). This is
 * the closed set the emission gate compiles against both platform bundles.
 */
export function collectStyledClasses(config: ExposedStyledConfig<StyledVariants>): string[] {
  const tokens = new Set<string>()
  collectInto({ config, tokens, seen: new Set(), depth: 0 })
  return [...tokens].sort()
}

/**
 * Variant names that collide with behavioural DOM attributes: on a string
 * (DOM-intrinsic) base a variant prop of this name is CONSUMED by the
 * factory (unless forwarded), silently deleting real element behaviour — a
 * `disabled` variant on a `<button>` styles the disabled look while leaving
 * the button clickable. Declare them in `forwardProps` so the real attribute
 * still reaches the element.
 */
const BEHAVIOURAL_DOM_ATTRIBUTES = new Set(['disabled', 'checked', 'value', 'readOnly', 'href', 'hidden'])

/**
 * Names the factory or React own: never legal as variant names on ANY base —
 * they would shadow the factory's own className/style lanes or React's
 * reserved props.
 */
const RESERVED_VARIANT_NAMES = new Set(['className', 'style', 'ref', 'key', 'children'])

/**
 * Definition-time validation (the factory runs it in dev): reject class forms
 * that are dead or destructive on a platform, and variant names that shadow
 * behavioural props. Complements — never replaces — the build-time emission
 * gate, which proves every collected class actually resolves in both
 * platform bundles.
 */
export function validateStyledClasses({
  config,
  componentName,
  domBase,
}: {
  config: ExposedStyledConfig<StyledVariants>
  componentName: string
  domBase?: boolean
}): void {
  const webOnly = config.platform === 'web'
  for (const token of collectStyledClasses(config)) {
    const parts = splitClassToken(token)
    for (const ban of BANNED_TOKEN_FORMS) {
      if ((!webOnly || !ban.webLegal) && ban.matches(parts)) {
        throw new Error(`styled(${componentName}): class "${token}" is not allowed — ${ban.reason}`)
      }
    }
  }
  const forwardKeys = new Set(config.forwardProps ?? [])
  for (const key of Object.keys(config.variants ?? {})) {
    if (RESERVED_VARIANT_NAMES.has(key)) {
      throw new Error(
        `styled(${componentName}): variant name "${key}" is reserved — it would shadow the factory's own prop surface`,
      )
    }
    if (domBase === true && BEHAVIOURAL_DOM_ATTRIBUTES.has(key) && !forwardKeys.has(key)) {
      throw new Error(
        `styled(${componentName}): variant "${key}" shadows a behavioural DOM attribute on a DOM base — the factory would consume the prop and the element would lose the real behaviour. Add it to forwardProps so the attribute still reaches the element.`,
      )
    }
  }
  for (const key of config.forwardProps ?? []) {
    if (config.variants?.[key] === undefined) {
      throw new Error(`styled(${componentName}): forwardProps key "${key}" is not a declared variant`)
    }
  }
}
