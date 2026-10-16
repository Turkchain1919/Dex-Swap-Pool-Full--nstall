/**
 * Extracts the referenced custom-property name when a theme value is a plain
 * one-level `var(--name)` indirection (no fallback argument) — the semantic
 * tokens in `@universe/tailwind/native.css` are declared as
 * `var(--color-*-light|dark)`, and uniwind may hand back the declared value
 * rather than the resolved terminal. Returns undefined for anything else.
 *
 * Platformless so the parsing is unit-testable without a React Native
 * runtime; consumed by `useThemeVariable.native.ts` (and re-exported by
 * shimmer's glare-color.ts, its original home).
 */
export function varReference(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim())?.[1]
}
