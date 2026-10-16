/**
 * Pure color helpers for the native shimmer's glare gradient. Platformless so
 * the guard logic is unit-testable without a React Native runtime.
 */

export const FALLBACK_GLARE_COLOR = '#FFFFFF'

// varReference moved to src/theme/ next to its consumer (useThemeVariable);
// re-exported here to keep this module's pinned export surface stable.
export { varReference } from '../theme/var-reference'

const SIMPLE_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

/**
 * Narrows a theme-provided value to a simple 6-digit hex color, falling back
 * to white otherwise — the guard the legacy `Shine.native.tsx` applies to
 * `useSporeColors().surface1.val` (gradient stops need a parseable hex),
 * hardened to validate the hex digits so a malformed 7-char token falls back
 * instead of throwing later in `opacifyGlareColor` mid-render.
 */
export function resolveGlareColor(value: unknown): string {
  return typeof value === 'string' && SIMPLE_HEX_PATTERN.test(value) ? value : FALLBACK_GLARE_COLOR
}

/**
 * Applies an opacity (0–100) to a simple 6-digit hex color by appending the
 * alpha byte (`#rrggbb` → `#rrggbbaa`) — byte-identical to what the legacy
 * `opacify(amount, color)` produced for the glare gradient stops. Input must
 * already be narrowed by {@link resolveGlareColor}.
 *
 * @throws on a non-`#rrggbb` color or an out-of-range amount (defect: callers
 * narrow via `resolveGlareColor` first).
 */
export function opacifyGlareColor(amount: number, hexColor: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
    throw new Error(`opacifyGlareColor expects a #rrggbb color, got '${hexColor}'`)
  }
  if (amount < 0 || amount > 100) {
    throw new Error(`opacifyGlareColor expects an amount in [0, 100], got ${amount}`)
  }
  const alphaHex = Math.round((amount / 100) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hexColor}${alphaHex}`
}
