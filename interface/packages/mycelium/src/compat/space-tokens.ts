// Type-only import of the compat map's key union, so the type can't drift from it.
import type { SporeSpaceToken } from './tokens'

/**
 * Drop-in for the `$`-token half of `SpaceTokens` from `ui/src` (INFRA-3495):
 * a space annotation converts by swapping the import alone wherever its
 * values are `$` tokens. Derived from `SPACE_TOKEN_PX`, never widened to
 * `string` or `number`.
 *
 * Deliberately NOT the whole Tamagui union: unlike `ColorTokens` (closed both
 * sides), Tamagui's `SpaceTokens` is open — it also accepts `number & {}`,
 * `'auto'`, percent/viewport/`calc()`/`var()` templates, `'unset'`/`'inherit'`,
 * and `Variable` objects. Mirroring those would couple mycelium to Tamagui
 * internals and break the string-assignability contract type-only
 * convertible specifiers rely on. So this union IS the `$`-token half of
 * Tamagui's `SpaceTokens`, exactly. A file whose values aren't all `$`
 * tokens keeps its legacy annotation and waits.
 *
 * Interop/annotation type only — parameters, returns, locals.
 */
export type SpaceTokens = SporeSpaceToken
