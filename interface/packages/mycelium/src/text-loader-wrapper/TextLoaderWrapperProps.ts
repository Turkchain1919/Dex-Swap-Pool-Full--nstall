import type { ReactNode } from 'react'

/**
 * Shared prop surface for the cross-platform `TextLoaderWrapper` — the legacy
 * `ui/src` loading chrome for text-shaped content (`components/text/Text.tsx`):
 * the children sized under a rounded placeholder bar, optionally wrapped in
 * the shimmer sweep.
 */
export interface TextLoaderWrapperProps {
  /**
   * The content whose footprint the placeholder bar takes. The native leg
   * hides it from screen readers; the web leg deliberately renders it
   * un-hidden — a legacy per-platform split kept verbatim.
   */
  children?: ReactNode
  /** Wrap the placeholder in the shimmer sweep (the legacy `Skeleton`); off renders the static bar. */
  loadingShimmer?: boolean
}
