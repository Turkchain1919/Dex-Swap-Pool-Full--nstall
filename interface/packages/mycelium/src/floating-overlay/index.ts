/**
 * Floating-overlay primitive for NATIVE tooltips and popovers (INFRA-2965).
 * The positioning engine (`geometry`) is pure and platform-agnostic; the
 * components resolve per platform (`FloatingOverlay.native.tsx` is the real
 * leg, web deliberately stubs toward the Base UI menus family, INFRA-3021).
 */
export {
  anchorRectFromPoint,
  computeArrowPosition,
  computeFloatingPosition,
  joinPlacement,
  resolveOffset,
  splitPlacement,
} from './geometry'
export type {
  ArrowPosition,
  ComputeArrowPositionParams,
  ComputeFloatingPositionParams,
  FloatingOverlayAlign,
  FloatingOverlayAnchorPoint,
  FloatingOverlayOffset,
  FloatingOverlayPlacement,
  FloatingOverlayPosition,
  FloatingOverlayRect,
  FloatingOverlaySide,
  FloatingOverlaySize,
} from './geometry'
export {
  FloatingOverlayAnchor,
  FloatingOverlayArrow,
  FloatingOverlayContent,
  FloatingOverlayProvider,
  FloatingOverlayRoot,
  useFloatingOverlayState,
} from './FloatingOverlay'
export { FLOATING_OVERLAY_LAYER_TEST_ID } from './types'
export type {
  FloatingOverlayAnchorProps,
  FloatingOverlayArrowProps,
  FloatingOverlayContentProps,
  FloatingOverlayProviderProps,
  FloatingOverlayRootProps,
  FloatingOverlayState,
} from './types'
