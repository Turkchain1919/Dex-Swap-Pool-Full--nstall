// Type-only import of the compat map's key union, so the type can't drift from it.
import type { SporeIconSizeToken } from './tokens'

/**
 * Drop-in for `IconSizeTokens` from `ui/src/theme` (INFRA-3505): mutually
 * assignable, so an annotation converts by swapping the import alone. Both
 * sides are closed unions over the same `iconSize` map — no open residue,
 * unlike `ColorTokens`. `packages/tailwind/src/parity/space-icon-tokens` is
 * the drift guard.
 *
 * Interop/annotation type only — parameters, returns, locals.
 */
export type IconSizeTokens = SporeIconSizeToken
