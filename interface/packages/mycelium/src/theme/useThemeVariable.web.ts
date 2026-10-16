/**
 * Web stub for the native-first `useThemeVariable` hook (the floating-overlay
 * web-stub shape). Deliberately NOT implemented: on web the CSS cascade
 * resolves theme tokens natively — style with `var(--name)` in
 * classNames/styles instead of reading tokens from JS. A getComputedStyle
 * implementation here would be a trap: it cannot subscribe to theme changes,
 * so consumers would render stale colors after a light/dark switch. An
 * accidental web import fails loudly instead.
 */
export function useThemeVariable(_name: string): string | number | undefined {
  throw new Error(
    'useThemeVariable is native-only (uniwind variable store). On web, consume theme tokens as CSS custom properties — var(--name) — in styles or classNames instead.',
  )
}
