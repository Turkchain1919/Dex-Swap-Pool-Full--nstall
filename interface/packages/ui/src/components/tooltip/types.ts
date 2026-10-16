import type { CSSProperties, ReactNode, Ref } from 'react'

/**
 * Prop contracts for the rebuilt, Tamagui-free Tooltip (INFRA-3318): the slice of the
 * legacy Tamagui `TooltipProps` / `Tooltip.Content` / `Tooltip.Trigger` surfaces that
 * repo call sites actually exercise, kept import-compatible under the same exports.
 *
 * Shared by all three platform legs — no react-native or DOM-runtime imports here.
 */

export type TooltipPlacementSide = 'top' | 'bottom' | 'left' | 'right'

/** The floating-ui placement vocabulary the legacy Tamagui popper accepted. */
export type TooltipPlacement = TooltipPlacementSide | `${TooltipPlacementSide}-start` | `${TooltipPlacementSide}-end`

/** floating-ui delay shape: one number for both edges, or per-edge open/close. */
export type TooltipDelay = number | { open?: number; close?: number }

/** floating-ui offset middleware shape the legacy popper accepted. */
export type TooltipOffset = number | { mainAxis?: number; crossAxis?: number }

export type TooltipAnimationDirection = 'left' | 'right' | 'top' | 'bottom'

/**
 * Root props (legacy `TooltipRoot` styled defaults documented in shared.ts).
 * Fully controlled when `open` is set, uncontrolled hover/focus otherwise —
 * exactly like the legacy `TooltipBase`.
 */
export interface TooltipProps {
  children?: ReactNode
  /** Controlled open state; omit for the default uncontrolled hover/focus behavior. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: TooltipPlacement
  offset?: TooltipOffset
  /** Hover timing pair (with `restMs`); defaults documented in shared.ts. */
  delay?: TooltipDelay
  restMs?: number
  /** `false` disables collision flipping/shifting (legacy floating-ui flip middleware). */
  allowFlip?: boolean
  /**
   * Accepted for drop-in typing: the rebuilt web leg's positioner keeps content in the
   * viewport by default, matching what the legacy shift middleware achieved.
   */
  stayInFrame?: boolean | Record<string, unknown>
  /** floating-ui positioning strategy → CSS position of the floating element. */
  strategy?: 'absolute' | 'fixed'
}

/**
 * The style-prop bag legacy call sites pass to `Tooltip.Content` / `Tooltip.Trigger`
 * (Tamagui stack props). Tokens (`$spacing12`, `$rounded12`, `$surface1`, …) resolve
 * to concrete theme values on the web leg; the native leg renders nothing.
 */
export interface TooltipFrameStyleProps {
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number | string
  borderRadius?: number | string
  width?: number | string
  height?: number | string
  minWidth?: number | string
  minHeight?: number | string
  maxWidth?: number | string
  maxHeight?: number | string
  flex?: number
  flexDirection?: CSSProperties['flexDirection']
  alignItems?: CSSProperties['alignItems']
  justifyContent?: CSSProperties['justifyContent']
  alignSelf?: CSSProperties['alignSelf']
  gap?: number | string
  position?: 'absolute' | 'relative'
  top?: number | string
  bottom?: number | string
  left?: number | string
  right?: number | string
  display?: CSSProperties['display']
  overflow?: CSSProperties['overflow']
  opacity?: number
  cursor?: string
  pointerEvents?: 'auto' | 'none'
  p?: number | string
  px?: number | string
  py?: number | string
  padding?: number | string
  paddingHorizontal?: number | string
  paddingVertical?: number | string
  paddingLeft?: number | string
  paddingRight?: number | string
  paddingTop?: number | string
  paddingBottom?: number | string
  m?: number | string
  mx?: number | string
  my?: number | string
  ml?: number | string
  mr?: number | string
  mt?: number | string
  mb?: number | string
  margin?: number | string
  marginHorizontal?: number | string
  marginVertical?: number | string
  marginLeft?: number | string
  marginRight?: number | string
  marginTop?: number | string
  marginBottom?: number | string
  shadowColor?: string
  shadowOffset?: { width: number; height: number }
  shadowOpacity?: number
  shadowRadius?: number
  /** Legacy Tamagui platform gate: applied verbatim on web, ignored elsewhere. */
  '$platform-web'?: CSSProperties
}

export interface TooltipContentProps extends TooltipFrameStyleProps {
  children?: ReactNode
  /** Enter/exit slide direction (legacy ±4px fade); defaults to 'top'. */
  animationDirection?: TooltipAnimationDirection
  /**
   * Accepted-inert legacy Tamagui surface, kept for drop-in typing (the tailwind
   * type-parity tripwire pins their presence): the rebuilt web leg has fixed
   * enter/exit motion and Base UI's own focus behavior.
   */
  animation?: unknown
  trapFocus?: boolean
  /**
   * Escape hatch for the stacking layer. When omitted, Tooltip.Content reads
   * EffectiveModalOrSheetZIndexContext and renders one layer above its closest
   * modal/sheet/popover ancestor (floor: `zIndexes.tooltip`).
   */
  zIndex?: number
  testID?: string
  onPress?: () => void
  ref?: Ref<HTMLDivElement>
}

export interface TooltipTriggerProps extends TooltipFrameStyleProps {
  children?: ReactNode
  /** Render the child element itself as the trigger, like Tamagui `asChild`. */
  asChild?: boolean
  testID?: string
  onPress?: () => void
  ref?: Ref<HTMLDivElement>
}

/**
 * Legacy `Tooltip.Arrow` accepted the full Tamagui style surface. The rebuilt web
 * arrow honors exactly `backgroundColor` and `borderColor` (Coachmark passes its
 * inverse-theme pair now that the portal escapes the `Theme inverse` DOM scope);
 * every other accepted style prop is drop-in typing only and stays inert.
 */
export interface TooltipArrowProps extends TooltipFrameStyleProps {
  children?: ReactNode
}
