/**
 * The RUNTIME face of the closed compat class set (INFRA-3217): membership
 * checks for the strict emission path, backed by the build-time generated
 * family list (`family-classes.generated.ts`) — the enumeration module
 * (`closed-set.ts`, token ladders, cross products, text metrics) is never
 * shipped to or re-derived in the browser; it runs only in the generator and
 * the test gates, which pin the generated data byte-for-byte.
 *
 * Membership at runtime is three-tiered:
 *  - the generated FAMILY list (base-tier token/enum/ladder classes);
 *  - the rendering component's own FIXED classes (its frame + resolved
 *    variant defaults, supplied per call via `ComposeCompatOptions`);
 *  - var-indirection twins, which are never looked up: they are validated by
 *    construction (`classToInlineStyle` only builds twins the generated
 *    safelist enumerates from the same tables — gate-pinned in
 *    closed-set.test.ts and emission-gate.test.ts).
 */
import { ENCODED_COMPAT_FAMILY_CLASSES } from './family-classes.generated'

/** `group` / `group/<name>` are inert markers — they emit no CSS and are always allowed. */
export function isCompatMarkerClass(cls: string): boolean {
  return cls === 'group' || cls.startsWith('group/')
}

let familySet: ReadonlySet<string> | undefined

/**
 * The generated family closed set (everything except per-component fixed
 * classes and twins). The generated entries are scanner-proof-encoded —
 * decoded once here — so neither oxide (web) nor uniwind (mobile) treats the
 * membership DATA as style candidates (see `closed-set-manifest.ts`).
 */
export function compatClosedFamilySet(): ReadonlySet<string> {
  familySet ??= new Set(
    ENCODED_COMPAT_FAMILY_CLASSES.map((cls) => cls.replace(/⟦/g, '[').replace(/⟧/g, ']').replace(/¦/g, ':')),
  )
  return familySet
}

/** Split compiled classNames (fixed frame invocations) into individual candidate classes. */
export function collectCompatClassNames(classNames: readonly string[]): string[] {
  return classNames
    .flatMap((className) => className.split(/\s+/))
    .filter((cls) => cls !== '' && !isCompatMarkerClass(cls))
}
