/**
 * Web stub of the platform split — mirrors packages/ui/src/utils/needs-small-font.ts,
 * which returns true on web (web never applies the native +1px adjustment).
 * Only the .native implementation is consulted by the native SegmentedControl.
 */
export const needsSmallFont = (): boolean => {
  return true
}
