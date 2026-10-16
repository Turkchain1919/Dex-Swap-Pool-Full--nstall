/**
 * Pseudo-state style pool → Tailwind variant map, shared by the pool
 * orchestration (`compose.ts`) and the closed-set enumeration
 * (`closed-set.ts`) — one source so the variant vocabulary can never drift
 * between the compiler and the generated safelist.
 */

/**
 * Declaration order matches the legacy composition order. Tamagui web gates
 * `disabledStyle` behind an `[aria-disabled]` attribute selector (the
 * `disabled` prop sets the attribute); the `aria-disabled:` variant is the
 * same mechanism.
 */
export const PSEUDO_VARIANT = {
  hoverStyle: 'hover',
  pressStyle: 'active',
  focusStyle: 'focus',
  focusVisibleStyle: 'focus-visible',
  focusWithinStyle: 'focus-within',
  disabledStyle: 'aria-disabled',
} as const

export type PseudoStyleKey = keyof typeof PSEUDO_VARIANT

export const PSEUDO_STYLE_KEYS = Object.keys(PSEUDO_VARIANT) as readonly PseudoStyleKey[]

/** The six pseudo variants, in composition order. */
export const PSEUDO_VARIANTS: readonly string[] = Object.values(PSEUDO_VARIANT)
