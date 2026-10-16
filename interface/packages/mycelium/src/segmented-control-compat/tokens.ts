/**
 * Legacy Spore space tokens (packages/ui/src/theme/spacing.ts) → uniwind gap
 * utilities. The legacy control types its `gap` override as Tamagui
 * `SpaceTokens`; this map covers the full concrete token scale so callsites
 * keep passing the same names. Tailwind's default spacing scale is 4px-based
 * (gap-1 = 4px), matching the token pixel values 1:1; `$spacing1` (1px) has no
 * scale step and uses an arbitrary value.
 */
export const GAP_CLASS_BY_TOKEN = {
  $none: 'gap-0',
  $spacing1: 'gap-[1px]',
  $spacing2: 'gap-0.5',
  $spacing4: 'gap-1',
  $spacing6: 'gap-1.5',
  $spacing8: 'gap-2',
  $spacing12: 'gap-3',
  $spacing16: 'gap-4',
  $spacing18: 'gap-4.5',
  $spacing20: 'gap-5',
  $spacing24: 'gap-6',
  $spacing28: 'gap-7',
  $spacing32: 'gap-8',
  $spacing36: 'gap-9',
  $spacing40: 'gap-10',
  $spacing48: 'gap-12',
  $spacing60: 'gap-15',
  $gap4: 'gap-1',
  $gap8: 'gap-2',
  $gap12: 'gap-3',
  $gap16: 'gap-4',
  $gap20: 'gap-5',
  $gap24: 'gap-6',
  $gap32: 'gap-8',
  $gap36: 'gap-9',
  $padding6: 'gap-1.5',
  $padding8: 'gap-2',
  $padding12: 'gap-3',
  $padding16: 'gap-4',
  $padding20: 'gap-5',
  $padding24: 'gap-6',
  $padding36: 'gap-9',
} as const

export type SegmentedControlGapToken = keyof typeof GAP_CLASS_BY_TOKEN
