export interface RevealingVaultLogoProps {
  isFirst: boolean
  visible: boolean
  zIndex: number
}

/** Horizontal overlap between stacked logos. */
export const LOGO_STACK_OVERLAP_ML = -8
/** Vertical offset a hidden logo drops in from. */
export const LOGO_DROP_START_Y = -8
