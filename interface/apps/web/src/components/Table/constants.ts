export const ROW_HEIGHT_DESKTOP = 56
export const ROW_HEIGHT_MOBILE_WEB = 48

/**
 * Clearance between the app header and a sticky element below it, on the add-liquidity pool browser.
 * Shared by the pools table's `stickyTopOffset` and the step sidebar's offset so the two stay on the
 * same line.
 *
 * Not derivable from `TableHead`'s 12px opening child: that child only reads as clearance where the
 * head's box has room for it (Explore's shorter header row), and the pool browser's taller row pushes
 * it out of the box entirely, leaving the row flush against the app header.
 */
export const STICKY_HEADER_TOP_GAP = 12
