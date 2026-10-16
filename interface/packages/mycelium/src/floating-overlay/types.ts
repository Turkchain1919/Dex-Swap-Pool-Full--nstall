/**
 * Public prop surface of the floating-overlay primitive (INFRA-2965), shared
 * by the platformless base stub and the `.native` / `.web` legs so all three
 * expose one contract.
 */
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { FloatingOverlayAnchorPoint, FloatingOverlayOffset, FloatingOverlayPlacement } from './geometry'

/** testID of the overlay layer the provider renders (targetable from argent/e2e flows). */
export const FLOATING_OVERLAY_LAYER_TEST_ID = 'floating-overlay-layer'

export interface FloatingOverlayProviderProps {
  children?: ReactNode
}

export interface FloatingOverlayRootProps {
  /** Controlled open state; omit to let the root manage it (see defaultOpen). */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /**
   * Window-coordinate point to anchor against instead of the measured
   * `FloatingOverlayAnchor` element — the native analog of the menus
   * family's `openAt(x, y)` virtual anchor.
   */
  anchorPoint?: FloatingOverlayAnchorPoint
  children?: ReactNode
}

export interface FloatingOverlayAnchorProps {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

export interface FloatingOverlayContentProps {
  /** Preferred placement relative to the anchor (default `bottom`, centered). */
  placement?: FloatingOverlayPlacement
  /** Main/cross-axis offset from the anchor, floating-ui `offset()` semantics (physical axes). */
  offset?: FloatingOverlayOffset
  /** Minimum gap kept between the content and the overlay-layer edge (default 8). */
  viewportPadding?: number
  /** Flip to the opposite side when the preferred side can't fit (default true). */
  flip?: boolean
  /** Pressing outside the content closes the overlay (default true); false renders no backdrop, so outside touches pass through. */
  dismissOnPressOutside?: boolean
  /** Android hardware back closes the overlay (default true). */
  dismissOnBackPress?: boolean
  /** Runs before an outside press closes the overlay. */
  onPressOutside?: () => void
  /**
   * Stacking of this overlay among its provider layer's overlays (applied to
   * the overlay's wrapper, so it reorders whole overlays). Defaults to mount
   * order; maps onto the web z-index bridge
   * (`EffectiveOverlayZIndexContext`, INFRA-3021) at reconciliation.
   */
  zIndex?: number
  style?: StyleProp<ViewStyle>
  testID?: string
  children?: ReactNode
}

export interface FloatingOverlayArrowProps {
  /** Square size of the arrow box in px (default 12). */
  size?: number
  /** Triangle fill — pass a resolved theme color (the primitive is token-agnostic). */
  color: string
  /** Keeps the arrow away from the content corners (default 8). */
  edgePadding?: number
  style?: StyleProp<ViewStyle>
  testID?: string
}

export interface FloatingOverlayState {
  open: boolean
  setOpen: (open: boolean) => void
}
