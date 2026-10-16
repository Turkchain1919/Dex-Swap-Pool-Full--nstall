import type { SporeAnimationCurveName } from '@universe/tailwind/animations'
import type { ReactNode } from 'react'

/**
 * Web-only style overrides for the animating container. The legacy Tamagui
 * component accepted arbitrary `FlexProps` here, but every call site in the
 * repo passes exactly one shape: per-axis overflow overrides under
 * `$platform-web` (the Table sites need `overflowY: 'clip'` +
 * `overflowX: 'visible'` — `overflow-y: hidden` would coerce `overflow-x` to
 * `auto`, breaking sticky pinned columns). The rebuild narrows the type to
 * that real usage instead of carrying the whole Tamagui prop surface.
 */
export interface HeightAnimatorStyleProps {
  '$platform-web'?: {
    overflowX?: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto'
    overflowY?: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto'
  }
}

/**
 * Shared prop surface for the cross-platform `HeightAnimator` primitive —
 * the same six-prop contract as the legacy `ui/src` component it replaces
 * (INFRA-3340), plus the two passthrough props existing call sites already
 * pass (`id`, `mt`).
 */
export interface HeightAnimatorProps {
  children: ReactNode
  /** Expanded (content height) vs collapsed (height 0). */
  open?: boolean
  /**
   * Start at the content's natural height on first render instead of
   * animating up from 0. Also disables `unmountChildrenWhenCollapsed`.
   */
  useInitialHeight?: boolean
  /** Spore curve for the height transition. */
  animation?: SporeAnimationCurveName
  styleProps?: HeightAnimatorStyleProps
  /** Skip animation entirely (e.g. inside a bottom sheet) — instant open/close. */
  animationDisabled?: boolean
  /** Unmount children (after the collapse settles) instead of keeping them hidden at height 0. */
  unmountChildrenWhenCollapsed?: boolean
  /** Forwarded to the outer element (Table pairs it with `aria-controls`). */
  id?: string
  /**
   * Accepted and ignored, matching the legacy component: it destructured only
   * its known props and spread nothing, so the `mt` one call site passes
   * (ActiveNetworkExpando) never rendered. Kept in the type — as `unknown`,
   * since the legacy site passes Tamagui theme values — so that call site
   * keeps compiling; applying it now would be a visual change.
   */
  mt?: unknown
}
