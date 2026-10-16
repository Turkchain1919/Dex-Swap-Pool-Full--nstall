/**
 * Device-height constants for `useIsShortMobileDevice`, mirroring
 * `ui/src/hooks/constants.ts`. Platform-free.
 */
import { spacing } from '../tokens'

/** Legacy `DEFAULT_BOTTOM_INSET` (`spacing.spacing20`). */
export const DEFAULT_BOTTOM_INSET = spacing.spacing20

// Matching the legacy enum's casing (IPhoneSE reads wrong — legacy comment).
export enum MobileDeviceHeight {
  iPhoneSE = 667,
  iPhone12 = 812,
}
