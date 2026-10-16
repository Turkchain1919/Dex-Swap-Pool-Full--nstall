import { radii } from '@universe/tailwind'
import { typographyClasses } from '@universe/tailwind/types'
import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Spore radius scale as tailwind-merge sees it: `none | 4 | 6 | … | full`.
 * Derived from the token package (itself pinned to css/theme.css by
 * `tokens.guard.test.ts`) so a new `--radius-*` needs no edit here.
 */
const radiusScale = Object.keys(radii)

/** Custom color classes for tailwind-merge conflict resolution */
const colorClasses = [
  'foreground',
  'background',
  'neutral1',
  'neutral1-light',
  'neutral1-dark',
  'neutral2',
  'neutral2-light',
  'neutral2-dark',
  'neutral3',
  'neutral3-light',
  'neutral3-dark',
  'surface1',
  'surface1-light',
  'surface1-dark',
  'surface2',
  'surface2-light',
  'surface2-dark',
  'surface3',
  'surface3-light',
  'surface3-dark',
  'surface4',
  'surface4-light',
  'surface4-dark',
  'surface5',
  'surface5-light',
  'surface5-dark',
  'accent1',
  'accent1-light',
  'accent1-dark',
  'accent2',
  'accent2-light',
  'accent2-dark',
  'pools-brand-green',
  'pools-brand-green-light',
  'pools-brand-green-dark',
  'success',
  'warning',
  'critical',
  'destructive',
  'muted-foreground',
  'card-foreground',
  'popover-foreground',
  'primary-foreground',
  'secondary-foreground',
  'destructive-foreground',
] as const

/**
 * Extended tailwind-merge configuration for Mycelium classes.
 * - Typography: ensures cn('text-sm', 'text-body-1') correctly resolves to 'text-body-1'
 * - Colors: ensures cn('text-foreground', 'text-critical') correctly resolves to 'text-critical'
 * - Radius: ensures cn('rounded-28', 'rounded-20') correctly resolves to 'rounded-20'.
 *   Extending `theme.radius` (rather than each `rounded*` classGroup) reaches all 15
 *   groups tailwind-merge builds from its radius scale — the shorthand, the four sides,
 *   the four corners and the logical `-s/-e/-ss/-se/-ee/-es` forms — and keeps its
 *   shorthand-beats-corner conflict graph intact. Without it every numeric radius is an
 *   unknown class, both survive the merge and stylesheet emission order picks the winner.
 * - white-space / overflow-wrap: the compat compilers spell these both as
 *   utilities (whitespace-nowrap) and as arbitrary properties (the values
 *   Tailwind ships no utility for, and the var-indirection twins), and
 *   `word-wrap` is the legacy alias of `overflow-wrap` — the same declaration.
 *   Without a shared group the two spellings both survive the merge, and the
 *   arbitrary-property rules sort BEFORE the utilities in the emitted
 *   stylesheet (measured), so a later pool's value loses to the frame's
 *   whitespace-pre-wrap / [word-wrap:break-word] defaults. (The regexes keep
 *   the brackets escaped so no scanner lifts a candidate out of this file.)
 * - text-decoration: the same two-spelling shape. `textDecorationLine`
 *   compiles to the curated Tailwind utilities (underline / line-through /
 *   no-underline); the `textDecoration` shorthand long tail compiles to
 *   `[text-decoration:…]` singles (ENUMERABLE_LONG_TAIL) plus its
 *   var-indirection twin (the same `[text-decoration:…]` shape, so one regex
 *   covers both). Same failure mode as whitespace/wrap without a shared
 *   group: a pool `textDecoration` value can lose to a `text-decoration-line`
 *   utility by emission order. (Deliberately NOT matching
 *   `[text-decoration-line:…]` here — TouchableArea's anchor base classes
 *   pair `[text-decoration-line:none]` with `[text-decoration:none]` as two
 *   simultaneous declarations, not competing pool values, and folding them
 *   into one group would drop one on merge.)
 */
const WHITE_SPACE_ARBITRARY = /^\[white-space:.+\]$/
const OVERFLOW_WRAP_ARBITRARY = /^\[(?:word-wrap|overflow-wrap):.+\]$/
const TEXT_DECORATION_ARBITRARY = /^\[text-decoration:.+\]$/

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [...typographyClasses],
      'text-color': colorClasses.map((c) => `text-${c}`),
      whitespace: [(cls: string) => WHITE_SPACE_ARBITRARY.test(cls)],
      // `wrap` is tailwind-merge's overflow-wrap group (wrap-break-word, …).
      wrap: [(cls: string) => OVERFLOW_WRAP_ARBITRARY.test(cls)],
      // `text-decoration` is tailwind-merge's group for underline / overline /
      // line-through / no-underline.
      'text-decoration': [(cls: string) => TEXT_DECORATION_ARBITRARY.test(cls)],
    },
    theme: {
      radius: radiusScale,
    },
  },
})

/**
 * Merge class names with Tailwind CSS conflict resolution.
 *
 * @example
 * cn('text-sm', 'text-body-1') // => 'text-body-1'
 * cn('bg-red-500', isActive && 'bg-blue-500') // => 'bg-blue-500' if isActive
 * cn('p-4', className) // Merge with external className prop
 */
export function cn(...inputs: ClassValue[]): string {
  return customTwMerge(clsx(inputs))
}
