/**
 * Error-message builders for `composeCompatEmission`'s out-of-set path
 * (extracted from `compose.ts` to keep it under the file-length gate) — pure
 * message construction, no state. See `compose.ts`'s `reportOutOfSetClass`
 * for when each is thrown.
 */
import { ARBITRARY_VAR_PROPS, VARIANT_TWIN_PROPS } from './inline-style'
import { ANIMATION_LONG_TAIL_PROPS } from './style-props'

/** The utility prefixes the animation longhands compile to (kebab-cased, bracketed), for targeting the diagnostic below. */
const ANIMATION_UTILITY_PREFIXES: readonly string[] = [...ANIMATION_LONG_TAIL_PROPS].map(
  (prop) => `[${prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:`,
)

/**
 * An animation-family class in a variant-prefixed pool is a KNOWN boundary,
 * not drift: the family has base-tier var twins only, so the generic
 * out-of-set message (group registration, closed-set extension) would send
 * the reader down the wrong path. Name the real cause and the way out.
 */
export function isVariantAnimationClass({ cls, prefix }: { cls: string; prefix: string | undefined }): boolean {
  return prefix !== undefined && ANIMATION_UTILITY_PREFIXES.some((utility) => cls.startsWith(utility))
}

export function animationVariantGapError({ pool, cls }: { pool: string; cls: string }): Error {
  return new Error(
    `compat: ${pool} compiles to "${cls}", but the animation longhand family has base-tier var twins only — ` +
      `variant-prefixed pools (pseudo, media, theme, group) sit outside the curated variant twin tier, so the ` +
      `emission lane cannot render this class. Move the animation props to the base pool or $platform-web, or add ` +
      `the family to the variant twin tier and regenerate the safelist (revisit condition tracked with INFRA-3597).`,
  )
}

const ARBITRARY_VAR_PROP_SET: ReadonlySet<string> = new Set(ARBITRARY_VAR_PROPS)
const VARIANT_TWIN_PROP_SET: ReadonlySet<string> = new Set(VARIANT_TWIN_PROPS)

/**
 * A property with a BASE-tier twin styled under a plain variant prefix
 * (pseudo/media/theme, or an unnamed group state — named group prefixes
 * carry a `/` and keep their own diagnostic in `outOfSetError`) whose
 * property sits outside the curated variant tier. Same KNOWN-boundary
 * status as the animation family: the generic remedies (group
 * registration, closed-set extension) all mislead here.
 */
export function isVariantTierPropertyGap({ cls, prefix }: { cls: string; prefix: string | undefined }): boolean {
  if (prefix === undefined || prefix.includes('/')) {
    return false
  }
  const prop = /^\[([a-zA-Z-]+):/.exec(cls)?.[1]
  return prop !== undefined && ARBITRARY_VAR_PROP_SET.has(prop) && !VARIANT_TWIN_PROP_SET.has(prop)
}

export function variantTierPropertyGapError({ pool, cls }: { pool: string; cls: string }): Error {
  return new Error(
    `compat: ${pool} compiles to "${cls}", but this property has a base-tier var twin only — variant-prefixed ` +
      `pools (pseudo, media, theme, group) cover just the curated variant twin tier, so the emission lane cannot ` +
      `render this class. Add the property to VARIANT_TWIN_PROPS (packages/mycelium/src/compat/twin-tiers.ts) and ` +
      `regenerate the safelist, or move the style to the base pool or $platform-web.`,
  )
}

export function outOfSetError({ pool, cls }: { pool: string; cls: string }): Error {
  return new Error(
    `compat: ${pool} compiles to "${cls}", which has no counterpart in the deterministic compat class set ` +
      `(packages/mycelium/compat-classes.gen.txt) — Tailwind cannot see runtime-computed classes, so it would ` +
      `silently render unstyled. Named group pools ($group-<name>-*) are name-parameterized: only names in ` +
      `REGISTERED_GROUP_NAMES (packages/mycelium/src/compat/group.ts) are enumerable — register the name and ` +
      `regenerate, use an unnamed group state, or move the style to a covered pool. A REGISTERED name landing ` +
      `here means the property is outside the curated named-group tier instead — add it to ` +
      `NAMED_GROUP_TWIN_PROPS / NAMED_GROUP_TWIN_UTILITIES (packages/mycelium/src/compat/twin-tiers.ts) and ` +
      `regenerate. Any other class shape landing here is compiler/closed-set drift: extend ` +
      `packages/mycelium/src/compat/closed-set.ts (or the twin tables in inline-style.ts) and regenerate.`,
  )
}
