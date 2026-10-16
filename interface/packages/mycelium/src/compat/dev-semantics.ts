/**
 * Shared dev-diagnostics semantics for the compat compilers. The dev gate
 * itself lives in `dev-build.ts` (extracted independently on main, shared
 * with `web-diagnostics.ts`); re-exported here so this module's consumers
 * (`preset-collision.ts`) keep their one import site.
 */
export { isDevelopmentBuild } from './dev-build'

/**
 * Production keep-and-report diagnostics are BOUNDED: dedupe sets cap at this
 * many distinct entries, then emit one final suppression notice — a
 * runtime-value-interpolating call site must not grow an unbounded Set and
 * console stream (review round 3).
 *
 * Level-neutral on purpose. The three lanes that share this cap no longer
 * agree on a level: `compose.ts` and `preset-collision.ts` still warn, while
 * `diagnostics.ts` reports at error. The cap bounds DEDUPE, not severity.
 */
export const MAX_DEDUPED_DIAGNOSTICS = 50
