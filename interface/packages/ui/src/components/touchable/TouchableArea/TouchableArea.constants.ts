/**
 * `Hovered` twins the mycelium boundary rejects (cold legacy-only tokens):
 * the hover swap keeps the base colour instead of injecting a token that
 * would throw. Like `MYCELIUM_INJECTED_TOKEN_MAP` in `TouchableArea.tsx`,
 * this is `TouchableArea`'s own gate list, not mycelium-exported data —
 * pinned directly by `TouchableArea.test.tsx`, so deleting or changing an
 * entry here fails a test instead of silently reopening the #38813
 * render-throw.
 * Exported for that pin, not for runtime use elsewhere.
 *
 * Kept in its own module (no `react-native`/`tamagui`/`expo-blur` imports)
 * so the mycelium-side pin can import this directly instead of hand-copying
 * the literals — mycelium's vitest environment doesn't alias `react-native`
 * to `react-native-web` the way `packages/ui`'s does, so pulling in the full
 * `TouchableArea.tsx` module graph from a mycelium test fails to parse.
 */
export const MYCELIUM_REJECTED_HOVERED_TOKENS = new Set([
  '$statusCritical2Hovered',
  '$statusSuccess2Hovered',
  '$statusWarning2Hovered',
])
