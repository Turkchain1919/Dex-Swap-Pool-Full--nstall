import type { PseudoStyleKey } from '../compat/pseudo'

export const ANCHOR_BASE_VAR = '--stext-a-col'

export const ANCHOR_PSEUDO_CODE = {
  hoverStyle: 'h',
  pressStyle: 'a',
  focusStyle: 'f',
  focusVisibleStyle: 'v',
  focusWithinStyle: 'w',
  disabledStyle: 'd',
} as const satisfies Record<PseudoStyleKey, string>

export type AnchorPseudoCode = (typeof ANCHOR_PSEUDO_CODE)[PseudoStyleKey]

export function anchorPseudoVar(code: AnchorPseudoCode): string {
  return `${ANCHOR_BASE_VAR}-${code}`
}
