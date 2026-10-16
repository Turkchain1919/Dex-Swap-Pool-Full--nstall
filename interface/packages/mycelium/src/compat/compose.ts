/**
 * Component-agnostic pool orchestration for the Tamagui→Tailwind compilers:
 * composes a component's per-style-object compiler across the base pool,
 * pseudo-state pools (`hover:`, `active:`, …), responsive media pools
 * (`media-sm:`, …), platform/theme overrides, group-state pools
 * (`group-hover/item:`, …), and the animation presets. Each component supplies
 * its own `styleClasses` (which classes one style object yields) and its frame
 * `baseClasses`; everything else is shared. The parity suite in
 * `packages/tailwind/src/parity` proves the output equivalent to Tamagui's.
 *
 * Two entry points share the pool walk:
 *  - `composeCompatClassName` — the raw class composition (parity harness,
 *    internal fixed frames): every value compiles to a class, like Tamagui.
 *  - `composeCompatEmission` — the deterministic-emission path the compat
 *    COMPONENTS render through (INFRA-3217): base-tier classes are checked
 *    against the closed pregenerated set (`packages/mycelium/compat-classes.gen.txt`);
 *    values outside it — and ALL values under variant prefixes that are not
 *    part of a component's fixed frame — swap to safelisted var-indirection
 *    twins that read the value from an inline `--c*` custom property
 *    (`inline-style.ts`). The one remaining open set is named group pools
 *    (`$group-<name>-*`) whose name is NOT in `REGISTERED_GROUP_NAMES`
 *    (`group.ts`, INFRA-3481): those THROW in development builds (in
 *    production they keep the class — possibly unstyled, like the legacy
 *    compiler — and warn, bounded). Registered names ride name-parameterized
 *    twins like every other variant pool.
 */
import type * as React from 'react'
import { cn } from '../cn'
import { ENTER_EXIT_PRESET_CLASSES, ENTER_PRESET_CLASSES, EXIT_PRESET_CLASSES } from './animations'
import { collectCompatClassNames, compatClosedFamilySet, isCompatMarkerClass } from './closed-set-runtime'
import { isDevelopmentBuild } from './dev-build'
import { MAX_DEDUPED_DIAGNOSTICS } from './dev-semantics'
import { resetBoundedReportBudgets } from './diagnostics'
import { groupMarkerClasses, groupStateVariant, parseGroupStateProp } from './group'
import { classToInlineStyle, DROP_CLASS } from './inline-style'
import { MEDIA_VARIANT } from './media'
import {
  animationVariantGapError,
  isVariantAnimationClass,
  isVariantTierPropertyGap,
  outOfSetError,
  variantTierPropertyGapError,
} from './out-of-set-error'
import { presetPoolClasses, validatePoolKeys, validatePseudoShapedKeys } from './pool-key-validation'
import { checkAnimationPresetCollision, resetPresetCollisionWarnings } from './preset-collision'
import type {
  CompatAnimationProps,
  CompatBehavioralProps,
  CompatProps,
  CompatPseudoProps,
  CompatStyleProp,
  MediaPropKey,
} from './props'
import { PSEUDO_VARIANT, PSEUDO_STYLE_KEYS, type PseudoStyleKey } from './pseudo'
import { warnDroppedRegisteredStyle, warnUnsupportedWebStyleKeys } from './web-diagnostics'

// The dev gate moved to `dev-build.ts` (shared with `web-diagnostics.ts`);
// re-exported so this module's consumers keep their one import site.
export { isDevelopmentBuild } from './dev-build'

function withVariant(variant: string, classes: string[]): string[] {
  return classes.map((cls) => `${variant}:${cls}`)
}

const FORCE_STYLE_KEY: Record<NonNullable<CompatBehavioralProps['forceStyle']>, PseudoStyleKey> = {
  hover: 'hoverStyle',
  press: 'pressStyle',
  focus: 'focusStyle',
  focusVisible: 'focusVisibleStyle',
  focusWithin: 'focusWithinStyle',
}

function animationClasses(props: CompatAnimationProps<unknown>): string[] {
  return [
    ...presetPoolClasses({ pool: 'animateEnter', preset: props.animateEnter, presets: ENTER_PRESET_CLASSES }),
    ...presetPoolClasses({ pool: 'animateExit', preset: props.animateExit, presets: EXIT_PRESET_CLASSES }),
    ...presetPoolClasses({
      pool: 'animateEnterExit',
      preset: props.animateEnterExit,
      presets: ENTER_EXIT_PRESET_CLASSES,
    }),
  ]
}

export interface ComposeCompatOptions<S> {
  props: CompatProps<S>
  /** The component's frame defaults (e.g. Flex's `flex flex-col …`). */
  baseClasses: string
  /** The component's per-style-object compiler. */
  styleClasses: (style: S) => string[]
  /**
   * The classNames the component's own resolved defaults compile to (frame
   * variants, always-on pseudo pools). Membership-checked alongside the
   * family set on the strict path; contributed to the generated safelist by
   * the same provider. Supply a STABLE module-level function returning raw
   * classNames (multi-class strings are fine) — the engine splits, dedupes,
   * and memoizes per provider, so components don't hand-roll caches.
   */
  fixedClasses?: () => Iterable<string>
}

/**
 * One pool's compiled classes plus how the strict path treats them:
 * `prefix` is the fully-composed variant prefix (undefined for base-tier
 * pools), `pool` names the source prop for error messages.
 */
interface PoolChunk {
  classes: string[]
  prefix?: string
  pool: string
}

/**
 * Walk every pool in the exact order the legacy composition concatenates
 * them. `themePseudoPools` compiles pseudo pools nested in `$theme-dark` /
 * `$theme-light` (`dark:hover:` composites) — the emission path does; the
 * legacy path must stay byte-identical to the shipped compiler, which drops
 * them (pre-existing; legacy-lane fix tracked on INFRA-3217).
 */
function poolChunks<S>(
  { props, baseClasses, styleClasses }: ComposeCompatOptions<S>,
  { themePseudoPools }: { themePseudoPools: boolean },
): PoolChunk[] {
  validatePoolKeys(props as Record<string, unknown>)
  const chunks: PoolChunk[] = [{ classes: baseClasses.split(' ').filter(Boolean), pool: 'frame' }]

  const hasAnimationPreset =
    props.animateEnter !== undefined || props.animateExit !== undefined || props.animateEnterExit !== undefined
  // Every style pool compiles through here so the preset/longhand collision
  // guard sees each one (base, buckets, pseudo, forced, theme, group).
  const compile = (style: S, pool: string): string[] => {
    if (hasAnimationPreset) {
      checkAnimationPresetCollision(style as object, pool)
    }
    return styleClasses(style)
  }

  // Compile a style object plus its nested pseudo pools, applying `prefix`
  // variants outermost. Closes over `compile` (the component's compiler).
  const pushStyleAndPseudo = (style: S & CompatPseudoProps<S>, options: { prefix?: string; pool: string }): void => {
    // Only the top-level base pool ('base') is the raw props bag `dom.tsx`
    // reads `enterStyle` from — every other pool name here is a nested style
    // value, where `enterStyle` has no reader and must stay loud (pool-key-validation.ts).
    validatePseudoShapedKeys(style as Record<string, unknown>, { isTopLevel: options.pool === 'base' })
    chunks.push({ classes: compile(style, options.pool), prefix: options.prefix, pool: options.pool })
    for (const pseudoKey of PSEUDO_STYLE_KEYS) {
      const variant = PSEUDO_VARIANT[pseudoKey]
      const pseudoStyle = style[pseudoKey]
      if (pseudoStyle !== undefined) {
        const pool = options.prefix === undefined ? pseudoKey : `${options.pool}.${pseudoKey}`
        chunks.push({
          classes: compile(pseudoStyle, pool),
          prefix: options.prefix === undefined ? variant : `${options.prefix}:${variant}`,
          pool,
        })
      }
    }
  }

  // Base pool, then $platform-web overrides (web builds always apply them),
  // then the state-forced merge — later classes win via tailwind-merge.
  pushStyleAndPseudo(props, { pool: 'base' })
  const platformWeb = props['$platform-web']
  if (platformWeb !== undefined) {
    pushStyleAndPseudo(platformWeb, { pool: '$platform-web' })
  }
  const forced = props.forceStyle !== undefined ? props[FORCE_STYLE_KEY[props.forceStyle]] : undefined
  if (forced !== undefined) {
    chunks.push({ classes: compile(forced, 'forceStyle'), pool: 'forceStyle' })
  }
  for (const [mediaKey, variant] of Object.entries(MEDIA_VARIANT) as [MediaPropKey, string][]) {
    const mediaStyle = props[mediaKey]
    if (mediaStyle !== undefined) {
      pushStyleAndPseudo(mediaStyle, { prefix: variant, pool: mediaKey })
      // Nested platform pool: pushed after the media pool's own props so it
      // wins conflicts, mirroring the top-level base→$platform-web order.
      // Same media prefix — web-only components make $platform-web
      // unconditional, so no extra variant composes in. The native pools
      // ($platform-native/-ios/-android) are ignored on web, like top level.
      // Reading only $platform-web here isn't an oversight — see MEDIA_REASON
      // (native-expectations.ts) for why there's no native-side media pool to mirror.
      const mediaPlatformWeb = mediaStyle['$platform-web']
      if (mediaPlatformWeb !== undefined) {
        pushStyleAndPseudo(mediaPlatformWeb, { prefix: variant, pool: `${mediaKey}.$platform-web` })
      }
    }
  }
  const themeDark = props['$theme-dark']
  if (themeDark !== undefined) {
    if (themePseudoPools) {
      pushStyleAndPseudo(themeDark, { prefix: 'dark', pool: '$theme-dark' })
    } else {
      chunks.push({ classes: compile(themeDark, '$theme-dark'), prefix: 'dark', pool: '$theme-dark' })
    }
  }
  const themeLight = props['$theme-light']
  if (themeLight !== undefined) {
    if (themePseudoPools) {
      pushStyleAndPseudo(themeLight, { prefix: 'light', pool: '$theme-light' })
    } else {
      chunks.push({ classes: compile(themeLight, '$theme-light'), prefix: 'light', pool: '$theme-light' })
    }
  }
  for (const key of Object.keys(props)) {
    if (!key.startsWith('$group-')) {
      continue
    }
    const parts = parseGroupStateProp(key)
    if (parts === undefined) {
      throw new Error(`compat: unsupported group prop "${key}" (container-size group queries have no CSS mapping)`)
    }
    const groupStyle = (props as Record<string, unknown>)[key] as S | undefined
    if (groupStyle !== undefined) {
      chunks.push({ classes: compile(groupStyle, key), prefix: groupStateVariant(parts), pool: key })
    }
  }
  chunks.push({
    // Animation presets are multi-class strings — split so the strict path
    // membership-checks real class tokens (cn output is unchanged).
    classes: [...groupMarkerClasses(props.group), ...animationClasses(props)].flatMap((cls) => cls.split(' ')),
    pool: 'markers',
  })
  return chunks
}

/**
 * Compile a component's full prop contract to a Tailwind className. Throws on
 * tokens with no `@universe/tailwind` counterpart instead of guessing.
 * Raw composition: every value compiles to a class whether or not that class
 * is in the emitted closed set — the parity harness and the internal fixed
 * frames (whose classes are all safelisted) consume this.
 */
export function composeCompatClassName<S>(options: ComposeCompatOptions<S>): string {
  const cls: string[] = []
  for (const chunk of poolChunks(options, { themePseudoPools: false })) {
    cls.push(...(chunk.prefix === undefined ? chunk.classes : withVariant(chunk.prefix, chunk.classes)))
  }
  return cn(cls, options.props.className)
}

/** The strict compilation result: guaranteed-emitted classes + the inline-value lane. */
export interface CompatEmission {
  className: string
  style?: React.CSSProperties
}

/**
 * Flatten a caller-supplied `style` to a single web style object, with React
 * Native `StyleSheet.flatten` semantics: arrays flatten depth-first
 * left→right with later entries winning; falsy entries are skipped.
 * `RegisteredStyle` ids (numbers) cannot be resolved on web and are dropped —
 * silently HERE; the web seams dev-warn (`warnDroppedRegisteredStyle`).
 * The one definition of what a `StyleProp` means on the web legs — every
 * caller-style seam must go through it (directly or via `mergeCompatStyle`)
 * or React DOM renders an array style as no style attribute at all.
 *
 * Platform-neutral by design: `checkbox-compat`'s `flattenStyleProp` delegates
 * here from BOTH its legs (its native-parity suite pins this walker against
 * real `StyleSheet.flatten`, whose number handling this drop matches), so the
 * web-only warnings — RN-only keys AND dropped `RegisteredStyle` ids — must
 * stay at the web-only seams: `mergeCompatStyle`, and the checkbox pair's web
 * legs which call the `web-diagnostics` pair themselves — never in here.
 */
export function flattenCompatStyle(style: CompatStyleProp | undefined): React.CSSProperties | undefined {
  if (typeof style === 'object' && style !== null && !Array.isArray(style)) {
    return style as React.CSSProperties
  }
  if (!Array.isArray(style)) {
    return undefined
  }
  let out: React.CSSProperties | undefined
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry)
      }
      return
    }
    if (typeof value === 'object' && value !== null) {
      out = { ...out, ...value }
    }
  }
  visit(style)
  return out
}

/**
 * Merge a caller-supplied `style` over the emission's inline custom
 * properties — the caller's declarations win, mirroring how the style
 * attribute already sat above the classes in the legacy composition. The one
 * canonical merge for every compat component (review round 3, item S3).
 * Accepts the full `CompatStyleProp` union; RN array/falsy forms are
 * flattened first, and development builds warn once per RN-only style key
 * that CSS cannot render and once per `RegisteredStyle` id the flatten drops.
 */
export function mergeCompatStyle(
  emissionStyle: React.CSSProperties | undefined,
  callerStyle: CompatStyleProp | undefined,
): React.CSSProperties | undefined {
  // On the RAW style — the flatten below is exactly what erases the id.
  warnDroppedRegisteredStyle(callerStyle)
  const flatCallerStyle = flattenCompatStyle(callerStyle)
  warnUnsupportedWebStyleKeys(flatCallerStyle)
  if (emissionStyle === undefined) {
    return flatCallerStyle
  }
  if (flatCallerStyle === undefined) {
    return emissionStyle
  }
  return { ...emissionStyle, ...flatCallerStyle }
}

/**
 * Production keep-and-warn diagnostics are BOUNDED: the dedupe set caps at
 * this many distinct classes, then emits one final suppression notice —
 * a runtime-value-interpolating call site must not grow an unbounded Set and
 * console stream (review round 3).
 */
const MAX_WARNED_OUT_OF_SET_CLASSES = MAX_DEDUPED_DIAGNOSTICS

let warnedOutOfSetClasses = new Set<string>()
let warnSuppressionAnnounced = false

/**
 * Test hook: reset every dedupe pool this module (and the modules it
 * delegates diagnostics to) accumulates — out-of-set classes, preset/longhand
 * collisions, and the bounded report budgets in `diagnostics.ts` (unknown pool
 * keys and unmapped icon colours) — so test files share one reset entry point
 * regardless of which gate produced the diagnostic.
 */
export function resetOutOfSetWarnings(): void {
  warnedOutOfSetClasses = new Set()
  warnSuppressionAnnounced = false
  resetPresetCollisionWarnings()
  resetBoundedReportBudgets()
}

/**
 * An out-of-set class with no safelisted var-indirection twin (unregistered
 * named group pools, REGISTERED named group pools styling a prop outside the
 * curated named-group tier, or compiler/closed-set drift). Development builds throw
 * so the gap is fixed before it ships; production builds keep the class — it
 * may render unstyled, exactly like the legacy compiler's scanner-invisible
 * classes — and warn once per unique class, bounded.
 */
function reportOutOfSetClass({
  pool,
  cls,
  animationVariantGap,
  variantTierGap,
}: {
  pool: string
  cls: string
  animationVariantGap: boolean
  variantTierGap: boolean
}): void {
  if (isDevelopmentBuild()) {
    if (animationVariantGap) {
      throw animationVariantGapError({ pool, cls })
    }
    throw variantTierGap ? variantTierPropertyGapError({ pool, cls }) : outOfSetError({ pool, cls })
  }
  if (warnedOutOfSetClasses.has(cls)) {
    return
  }
  if (warnedOutOfSetClasses.size >= MAX_WARNED_OUT_OF_SET_CLASSES) {
    if (!warnSuppressionAnnounced) {
      warnSuppressionAnnounced = true
      // oxlint-disable-next-line no-console -- production-only diagnostic; the dev build throws instead
      console.warn(
        `compat: ${MAX_WARNED_OUT_OF_SET_CLASSES} distinct out-of-set classes warned — further warnings suppressed.`,
      )
    }
    return
  }
  warnedOutOfSetClasses.add(cls)
  // oxlint-disable-next-line no-console -- production-only diagnostic; the dev build throws instead
  console.warn(
    `compat: ${pool} compiles to "${cls}", which is outside the compat class set — it may render unstyled. ` +
      `See packages/mycelium/src/compat/closed-set.ts.`,
  )
}

/**
 * Engine-owned memoization of the per-component fixed classes (review round
 * 3, item S2): keyed on the provider function's identity, so providers must
 * be stable module-level functions, and component nine cannot get the
 * hand-rolled cache wrong.
 */
const fixedSetCache = new WeakMap<() => Iterable<string>, ReadonlySet<string>>()

function resolveFixedSet(provider: (() => Iterable<string>) | undefined): ReadonlySet<string> | undefined {
  if (provider === undefined) {
    return undefined
  }
  let set = fixedSetCache.get(provider)
  if (set === undefined) {
    set = new Set(collectCompatClassNames([...provider()]))
    fixedSetCache.set(provider, set)
  }
  return set
}

interface EmissionState {
  kept: string[]
  /** `--c*` custom property → value (the inline-value lane). */
  style: Record<string, string>
  /** var-indirection class → its custom properties, for post-merge pruning. */
  varClassProps: Map<string, string[]>
}

/**
 * Compile a component's full prop contract to a className whose every class
 * is guaranteed present in the emitted stylesheet, plus an inline style
 * object of `--c*` custom properties feeding the var-indirection twins of
 * values outside the closed set — under the base tier AND under every
 * reachable variant prefix (the variant twin is static and safelisted; the
 * custom property is set unconditionally and only consumed under the
 * variant). Because the twins are ordinary classes, pool precedence,
 * tailwind-merge conflicts, and variant overrides behave exactly like the
 * legacy class composition. Named-group-pool values with no twin — an
 * unregistered name, or a registered name styling a prop outside the curated
 * named-group tier — throw in development (see `reportOutOfSetClass`).
 */
export function composeCompatEmission<S>(options: ComposeCompatOptions<S>): CompatEmission {
  const familySet = compatClosedFamilySet()
  const fixedSet = resolveFixedSet(options.fixedClasses)
  const inSet = (cls: string): boolean => familySet.has(cls) || fixedSet?.has(cls) === true

  const state: EmissionState = { kept: [], style: {}, varClassProps: new Map() }
  for (const chunk of poolChunks(options, { themePseudoPools: true })) {
    for (const cls of chunk.classes) {
      const composed = chunk.prefix === undefined ? cls : `${chunk.prefix}:${cls}`
      if (isCompatMarkerClass(cls) || inSet(composed)) {
        state.kept.push(composed)
        continue
      }
      const converted = classToInlineStyle(cls, chunk.prefix ?? '')
      if (converted === DROP_CLASS) {
        // A themed `dark:` sibling — redundant next to its auto-switching twin.
        continue
      }
      if (converted === undefined) {
        // No twin: named group prefixes (name-parameterized), the animation
        // family's variant tiers, and compiler/closed-set drift land here.
        reportOutOfSetClass({
          pool: chunk.pool,
          cls: composed,
          animationVariantGap: isVariantAnimationClass({ cls, prefix: chunk.prefix }),
          variantTierGap: isVariantTierPropertyGap({ cls, prefix: chunk.prefix }),
        })
        state.kept.push(composed)
        continue
      }
      state.kept.push(converted.varClass)
      state.style[converted.varProp] = converted.value
      const props = state.varClassProps.get(converted.varClass) ?? []
      props.push(converted.varProp)
      state.varClassProps.set(converted.varClass, props)
    }
  }

  const className = cn(state.kept, options.props.className)
  // Drop custom properties whose var class lost its tailwind-merge conflict
  // (a later pool re-owned the surface) — the value has no reader left.
  if (state.varClassProps.size > 0) {
    const finalTokens = new Set(className.split(/\s+/))
    for (const [varClass, props] of state.varClassProps) {
      if (!finalTokens.has(varClass)) {
        for (const prop of props) {
          delete state.style[prop]
        }
      }
    }
  }
  return Object.keys(state.style).length === 0
    ? { className }
    : { className, style: state.style as React.CSSProperties }
}
