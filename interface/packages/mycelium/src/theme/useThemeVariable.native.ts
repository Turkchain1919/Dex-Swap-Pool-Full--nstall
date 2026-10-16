import { useCSSVariable } from 'uniwind'
import { varReference } from './var-reference'

/**
 * Reads a theme variable from uniwind's store, resolving up to three levels
 * of plain `var()` indirection (the semantic tokens in
 * @universe/tailwind/native.css are declared as `var(--color-*-light|dark)`;
 * deeper chains are defensive). The hook calls are unconditional and
 * constant-count (rules of hooks) — a level with no further indirection
 * re-reads the previous name as a no-op.
 *
 * Native-only module (uniwind's variable store), shared by the Shimmer and
 * Unicon native legs (they import this leg explicitly — they specifically
 * want the store implementation, and the web leg is a deliberate stub).
 */
export function useThemeVariable(name: string): string | number | undefined {
  const level0 = useCSSVariable(name)
  const reference1 = varReference(level0)
  const level1 = useCSSVariable(reference1 ?? name)
  const value1 = reference1 === undefined ? level0 : level1
  const reference2 = varReference(value1)
  const level2 = useCSSVariable(reference2 ?? name)
  const value2 = reference2 === undefined ? value1 : level2
  const reference3 = varReference(value2)
  const level3 = useCSSVariable(reference3 ?? name)
  return reference3 === undefined ? value2 : level3
}
