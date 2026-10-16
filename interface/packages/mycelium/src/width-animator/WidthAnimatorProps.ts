import type { ReactNode } from 'react'

/**
 * Web-only style overrides for the animating container. The legacy Tamagui
 * component spread arbitrary `ViewProps` here, but the sole call site in the
 * repo (Swap `index.tsx`) passes exactly one shape: flex-shrink sizing under
 * `$platform-web` so the chart card yields width before the page overflows.
 * The rebuild narrows the type to that real usage instead of carrying the
 * whole Tamagui prop surface.
 */
export interface WidthAnimatorStyleProps {
  '$platform-web'?: {
    flexShrink?: number
    minWidth?: number
  }
}

/**
 * Shared prop surface for the cross-platform `WidthAnimator` primitive — the
 * same contract as the legacy `ui/src` component it replaces, narrowed to the
 * props real call sites pass.
 */
export interface WidthAnimatorProps {
  children: ReactNode
  /** Expanded (`contentWidth`/measured width) vs collapsed (width 0). */
  open?: boolean
  /** Fixed pixel height — the container never sizes height to content (legacy limitation, kept). */
  height: number
  /**
   * Pixel width to open to. When omitted, the container opens to the content
   * wrapper's measured width — but the wrapper is sized `100%` of the
   * container, so without an external width the measurement stays 0 and the
   * container never opens (legacy limitation, kept bug-compatible).
   */
  contentWidth?: number
  /** Pixel margin-top, animated like the legacy Tamagui driver animated it. */
  mt?: number
  /** Skip animation entirely — instant open/close, no transition and no overflow-release delay. */
  animationDisabled?: boolean
  styleProps?: WidthAnimatorStyleProps
}
