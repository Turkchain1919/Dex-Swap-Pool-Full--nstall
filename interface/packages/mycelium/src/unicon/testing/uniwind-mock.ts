/**
 * Minimal uniwind stand-in for the unicon vitest suites: `useCSSVariable`
 * reads from a test-settable variable table instead of the native variable
 * store (the real store needs the uniwind Metro runtime). Test files alias
 * the real module via `vi.mock('uniwind', () => import('./testing/uniwind-mock'))`.
 */
let variables: Record<string, string | number | undefined> = {}

/** Test hook: replaces the variable table served by `useCSSVariable`. */
export function __setCSSVariables(next: Record<string, string | number | undefined>): void {
  variables = next
}

/** Test hook: clears the variable table (unresolved-token scenarios). */
export function __resetCSSVariables(): void {
  variables = {}
}

export function useCSSVariable(name: string): string | number | undefined {
  return variables[name]
}
