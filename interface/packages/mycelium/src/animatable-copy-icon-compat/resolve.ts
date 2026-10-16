/**
 * Platform-neutral pieces shared by both `AnimatableCopyIconCompat` legs —
 * the CopySheets glyph geometry and the color resolution (the
 * `modal-close-icon/resolve.ts` mechanism). Sharing them is what keeps the
 * two legs drawing the same icon.
 */
import type { SporeColor, SporeColorKey, UseSporeColorsReturn } from '../theme-hooks-compat'

/**
 * The CopySheets icon's geometry, copied from
 * `../components/icons/CopySheets.tsx` (the icon pipeline's port of the
 * `ui/src` CopySheets). The native leg cannot render that component —
 * mycelium icons emit a DOM `<svg>` — so it draws from this constant instead;
 * the drift pin in `AnimatableCopyIconCompat.test.tsx` asserts it stays
 * byte-identical to the rendered CopySheets.
 */
export const COPY_SHEETS_GLYPH = {
  viewBox: '0 0 24 24',
  path: 'M18.375 6.25H9.625C7.448 6.25 6.25 7.448 6.25 9.625V18.375C6.25 20.552 7.448 21.75 9.625 21.75H18.375C20.552 21.75 21.75 20.552 21.75 18.375V9.625C21.75 7.448 20.552 6.25 18.375 6.25ZM20.25 18.375C20.25 19.707 19.707 20.25 18.375 20.25H9.625C8.293 20.25 7.75 19.707 7.75 18.375V9.625C7.75 8.293 8.293 7.75 9.625 7.75H18.375C19.707 7.75 20.25 8.293 20.25 9.625V18.375ZM3.75 5.62V14.38C3.75 15.578 4.23309 15.873 4.39209 15.971C4.74609 16.187 4.85589 16.649 4.63989 17.002C4.49789 17.233 4.25202 17.36 3.99902 17.36C3.86602 17.36 3.72991 17.324 3.60791 17.25C2.70691 16.698 2.25 15.733 2.25 14.38V5.62C2.25 3.478 3.47912 2.25 5.62012 2.25H14.3799C16.0649 2.25 16.87 2.98897 17.25 3.60797C17.466 3.96097 17.355 4.42298 17.002 4.63898C16.648 4.85598 16.1879 4.74399 15.9709 4.39099C15.8739 4.23199 15.5779 3.74902 14.3799 3.74902H5.62012C4.29212 3.75002 3.75 4.292 3.75 5.62Z',
} as const

/**
 * Resolve a `$`-color token through the `useSporeColors` theme map — `.val`
 * is the active theme's resolved literal, which a `react-native-svg` `fill`
 * accepts. Non-token strings pass through unchanged; a `$`-token outside the
 * theme map throws — same as FlexCompat — rather than reaching the leaf raw.
 */
export function resolveCopyIconColor(value: string, colors: UseSporeColorsReturn): string {
  if (!value.startsWith('$')) {
    return value
  }
  const entry = (colors as Partial<Record<SporeColorKey, SporeColor>>)[value as SporeColorKey]
  if (entry === undefined) {
    throw new Error(`AnimatableCopyIcon: color token "${value}" has no theme counterpart`)
  }
  return entry.val
}
