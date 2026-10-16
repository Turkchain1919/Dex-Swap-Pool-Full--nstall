import type {
  TooltipDelay,
  TooltipOffset,
  TooltipPlacement,
  TooltipPlacementSide,
} from 'ui/src/components/tooltip/types'

/**
 * Platform-neutral constants and pure positioning/timing mappers for the rebuilt
 * Tooltip (INFRA-3318). The defaults transcribe the legacy `TooltipRoot`/`ContentInner`
 * styled configs (Tooltip.web.tsx on the Tamagui baseline); the mappers port the
 * parity-pinned coordinate/timing algebra from mycelium's tooltip-compat
 * (packages/mycelium/src/tooltip-compat, INFRA-3021) so both rebuilds agree.
 */

/** Legacy `TooltipRoot` styled defaults. */
export const TOOLTIP_DEFAULT_OFFSET: TooltipOffset = { mainAxis: 16 }
export const TOOLTIP_DEFAULT_DELAY: TooltipDelay = { close: 500, open: 0 }
export const TOOLTIP_DEFAULT_REST_MS = 200

/** Legacy `ContentInner` frame literals. */
export const TOOLTIP_CONTENT_MAX_WIDTH = 350
export const TOOLTIP_CONTENT_PADDING = 12
export const TOOLTIP_CONTENT_GAP = 8
export const TOOLTIP_CONTENT_BORDER_RADIUS = 12
export const TOOLTIP_BORDER_WIDTH = 1

/** Legacy `Arrow` styled size ($spacing12 square, rotated 45°). */
export const TOOLTIP_ARROW_SIZE = 12

/** Legacy enter/exit slide distance per `animationDirection`. */
export const TOOLTIP_ANIMATION_OFFSET = 4

/**
 * data-slot stamped on the web leg's popup element; the trigger's touch-dismissal
 * guard matches on it so taps inside any tooltip popup never dismiss.
 */
export const TOOLTIP_POPUP_DATA_SLOT = 'ui-tooltip-popup'

export type TooltipAlign = 'start' | 'center' | 'end'

export interface TooltipAnchorPosition {
  side: TooltipPlacementSide
  align: TooltipAlign
}

/** Tamagui/floating-ui placement → side/align pair. Tamagui's default placement is `bottom` (centered). */
export function mapPlacementToAnchorPosition(placement?: TooltipPlacement): TooltipAnchorPosition {
  if (placement === undefined) {
    return { side: 'bottom', align: 'center' }
  }
  const [side, align] = placement.split('-') as [TooltipPlacementSide, 'start' | 'end' | undefined]
  return { side, align: align ?? 'center' }
}

/**
 * floating-ui `offset({ mainAxis, crossAxis })` → positioner `sideOffset`/`alignOffset`.
 * The legacy crossAxis is PHYSICAL (positive = right/down); the positioner routes
 * `alignOffset` through floating-ui's `alignmentAxis`, which flips sign for `end`
 * alignment — so the mapper pre-flips to keep the rendered offset physical, matching
 * the legacy behavior byte for byte.
 */
export function mapOffsetToAnchorPosition({
  offset,
  align,
}: {
  offset: TooltipOffset | undefined
  align: TooltipAlign
}): { sideOffset: number; alignOffset: number } {
  if (offset === undefined) {
    return { sideOffset: 0, alignOffset: 0 }
  }
  if (typeof offset === 'number') {
    return { sideOffset: offset, alignOffset: 0 }
  }
  const crossAxis = offset.crossAxis ?? 0
  return {
    sideOffset: offset.mainAxis ?? 0,
    alignOffset: align === 'end' ? -crossAxis : crossAxis,
  }
}

/**
 * Map the legacy hover-timing pair (`delay` + `restMs`) onto a single open/close delay
 * pair. Legacy semantics: floating-ui opens after the pointer RESTS `restMs` when
 * `delay.open` is 0, else after `delay.open`; closes after `delay.close`. The rebuilt
 * web leg has one fixed open delay, so `restMs` stands in for a zero open delay
 * (the same ledgered approximation as mycelium's tooltip-compat).
 */
export function mapTooltipDelay({ delay, restMs }: { delay: TooltipDelay; restMs: number }): {
  openDelayMs: number
  closeDelayMs: number
} {
  const openDelay = typeof delay === 'number' ? delay : (delay.open ?? 0)
  const closeDelay = typeof delay === 'number' ? delay : (delay.close ?? 0)
  return {
    openDelayMs: openDelay > 0 ? openDelay : restMs,
    closeDelayMs: closeDelay,
  }
}
