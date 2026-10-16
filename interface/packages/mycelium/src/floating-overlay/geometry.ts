/**
 * Pure positioning engine for the native floating-overlay primitive
 * (INFRA-2965): anchored placement with flip, cross-axis shift, physical
 * offsets, and arrow coordinates — the native stand-in for the floating-ui
 * positioning that Base UI gives the web menus family (INFRA-3021) for free.
 *
 * Vocabulary mirrors `popover-compat/position.ts` on the INFRA-3021 stack
 * (side / align / placement / mainAxis-crossAxis offsets) so the two tracks
 * reconcile onto one grammar when both land. Kept pure so the suite can pin
 * the coordinate algebra without a native runtime.
 */

export type FloatingOverlaySide = 'top' | 'bottom' | 'left' | 'right'
export type FloatingOverlayAlign = 'start' | 'center' | 'end'
export type FloatingOverlayPlacement = FloatingOverlaySide | `${FloatingOverlaySide}-${'start' | 'end'}`

/**
 * The floating-ui offset shape the legacy Tamagui overlays accept. Both axes
 * are PHYSICAL like floating-ui's `offset()`: positive `crossAxis` always
 * moves right (top/bottom sides) or down (left/right sides), regardless of
 * alignment. (The legacy Coachmark hook flips `crossAxis` for `-end`
 * placements — a logical-axis divergence documented in the PR ledger.)
 */
export type FloatingOverlayOffset = number | { mainAxis?: number; crossAxis?: number }

/** Rectangle in the coordinate space of the overlay layer (window coords translated to the host). */
export interface FloatingOverlayRect {
  x: number
  y: number
  width: number
  height: number
}

export interface FloatingOverlaySize {
  width: number
  height: number
}

/** Virtual point anchor — the native analog of the menus family's `openAt(x, y)` floating-ui virtual element. */
export interface FloatingOverlayAnchorPoint {
  x: number
  y: number
}

export interface FloatingOverlayPosition {
  /** Top-left of the content, in overlay-layer coordinates. */
  x: number
  y: number
  /** Placement actually used after flipping. */
  placement: FloatingOverlayPlacement
  side: FloatingOverlaySide
  align: FloatingOverlayAlign
  /**
   * Cross-axis coordinate of the anchor center relative to the content's
   * origin — the line the arrow points along. `x`-axis for top/bottom sides,
   * `y`-axis for left/right sides.
   */
  crossAxisAnchorLine: number
}

export interface ComputeFloatingPositionParams {
  anchor: FloatingOverlayRect
  size: FloatingOverlaySize
  viewport: FloatingOverlaySize
  placement?: FloatingOverlayPlacement
  offset?: FloatingOverlayOffset
  /** Minimum gap kept between the content and the viewport edge (shift clamp). */
  viewportPadding?: number
  /** Flip to the opposite side when the requested side can't fit the content. */
  flip?: boolean
}

export interface ArrowPosition {
  /** Offsets of the arrow box relative to the content's origin. */
  left: number
  top: number
  /** Which content edge the arrow sits on (the edge facing the anchor). */
  edge: FloatingOverlaySide
}

export interface ComputeArrowPositionParams {
  side: FloatingOverlaySide
  size: FloatingOverlaySize
  crossAxisAnchorLine: number
  arrowSize: number
  /** Keeps the arrow away from the content corners (e.g. inside a border radius). */
  edgePadding?: number
}

const DEFAULT_VIEWPORT_PADDING = 8
const DEFAULT_ARROW_EDGE_PADDING = 8

/** Tamagui/floating-ui default placement is `bottom` (centered). */
export function splitPlacement(placement?: FloatingOverlayPlacement): {
  side: FloatingOverlaySide
  align: FloatingOverlayAlign
} {
  if (placement === undefined) {
    return { side: 'bottom', align: 'center' }
  }
  const [side, align] = placement.split('-') as [FloatingOverlaySide, 'start' | 'end' | undefined]
  return { side, align: align ?? 'center' }
}

export function joinPlacement(side: FloatingOverlaySide, align: FloatingOverlayAlign): FloatingOverlayPlacement {
  return align === 'center' ? side : `${side}-${align}`
}

export function resolveOffset(offset?: FloatingOverlayOffset): { mainAxis: number; crossAxis: number } {
  if (offset === undefined) {
    return { mainAxis: 0, crossAxis: 0 }
  }
  if (typeof offset === 'number') {
    return { mainAxis: offset, crossAxis: 0 }
  }
  return { mainAxis: offset.mainAxis ?? 0, crossAxis: offset.crossAxis ?? 0 }
}

/** A virtual point anchor as a zero-size rect, so point and element anchors share one code path. */
export function anchorRectFromPoint(point: FloatingOverlayAnchorPoint): FloatingOverlayRect {
  return { x: point.x, y: point.y, width: 0, height: 0 }
}

/**
 * Clamp with a deliberate inverted-bounds contract: when the range collapses
 * (`max < min`, i.e. the content is larger than the padded viewport, or the
 * arrow larger than the padded content edge) the result pins to `min` — the
 * START edge (top/left padding) stays visible and the content overflows the
 * far edge instead. Pinned by tests; change requires a ledger entry.
 */
function clamp(value: number, bounds: { min: number; max: number }): number {
  return Math.min(Math.max(value, bounds.min), Math.max(bounds.min, bounds.max))
}

const OPPOSITE_SIDE: Record<FloatingOverlaySide, FloatingOverlaySide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

function oppositeSide(side: FloatingOverlaySide): FloatingOverlaySide {
  return OPPOSITE_SIDE[side]
}

function isVertical(side: FloatingOverlaySide): boolean {
  return side === 'top' || side === 'bottom'
}

/** Space available between the anchor's `side` edge (plus main-axis offset) and the padded viewport edge. */
function availableSpace(params: {
  side: FloatingOverlaySide
  anchor: FloatingOverlayRect
  viewport: FloatingOverlaySize
  mainAxis: number
  viewportPadding: number
}): number {
  const { side, anchor, viewport, mainAxis, viewportPadding } = params
  if (side === 'top') {
    return anchor.y - mainAxis - viewportPadding
  }
  if (side === 'bottom') {
    return viewport.height - (anchor.y + anchor.height) - mainAxis - viewportPadding
  }
  if (side === 'left') {
    return anchor.x - mainAxis - viewportPadding
  }
  return viewport.width - (anchor.x + anchor.width) - mainAxis - viewportPadding
}

function mainAxisCoordinate(params: {
  side: FloatingOverlaySide
  anchor: FloatingOverlayRect
  size: FloatingOverlaySize
  mainAxis: number
}): number {
  const { side, anchor, size, mainAxis } = params
  if (side === 'top') {
    return anchor.y - size.height - mainAxis
  }
  if (side === 'bottom') {
    return anchor.y + anchor.height + mainAxis
  }
  if (side === 'left') {
    return anchor.x - size.width - mainAxis
  }
  return anchor.x + anchor.width + mainAxis
}

function crossAxisCoordinate(params: {
  side: FloatingOverlaySide
  align: FloatingOverlayAlign
  anchor: FloatingOverlayRect
  size: FloatingOverlaySize
  crossAxis: number
}): number {
  const { side, align, anchor, size, crossAxis } = params
  const anchorStart = isVertical(side) ? anchor.x : anchor.y
  const anchorLength = isVertical(side) ? anchor.width : anchor.height
  const contentLength = isVertical(side) ? size.width : size.height
  if (align === 'start') {
    return anchorStart + crossAxis
  }
  if (align === 'end') {
    return anchorStart + anchorLength - contentLength + crossAxis
  }
  return anchorStart + anchorLength / 2 - contentLength / 2 + crossAxis
}

/**
 * Places `size` next to `anchor` inside `viewport`: offset → flip (opposite
 * side, only when it fits better) → cross-axis shift clamp — the subset of
 * floating-ui's `offset`/`flip`/`shift`/`arrow` middleware behavior the
 * native tooltips/popovers need. All coordinates are overlay-layer-local.
 */
export function computeFloatingPosition(params: ComputeFloatingPositionParams): FloatingOverlayPosition {
  const { anchor, size, viewport, placement, offset, flip = true } = params
  const viewportPadding = params.viewportPadding ?? DEFAULT_VIEWPORT_PADDING
  const { side: requestedSide, align } = splitPlacement(placement)
  const { mainAxis, crossAxis } = resolveOffset(offset)

  let side = requestedSide
  if (flip) {
    const requestedSpace = availableSpace({ side: requestedSide, anchor, viewport, mainAxis, viewportPadding })
    const contentLength = isVertical(requestedSide) ? size.height : size.width
    if (requestedSpace < contentLength) {
      const flipped = oppositeSide(requestedSide)
      const flippedSpace = availableSpace({ side: flipped, anchor, viewport, mainAxis, viewportPadding })
      // floating-ui flip fallback: use the opposite side when it fits, or
      // when neither fits, whichever has more room.
      if (flippedSpace >= contentLength || flippedSpace > requestedSpace) {
        side = flipped
      }
    }
  }

  const main = mainAxisCoordinate({ side, anchor, size, mainAxis })
  const rawCross = crossAxisCoordinate({ side, align, anchor, size, crossAxis })
  const crossViewportLength = isVertical(side) ? viewport.width : viewport.height
  const crossContentLength = isVertical(side) ? size.width : size.height
  const cross = clamp(rawCross, {
    min: viewportPadding,
    max: crossViewportLength - crossContentLength - viewportPadding,
  })

  const x = isVertical(side) ? cross : main
  const y = isVertical(side) ? main : cross

  const anchorCenter = isVertical(side) ? anchor.x + anchor.width / 2 : anchor.y + anchor.height / 2
  const crossAxisAnchorLine = anchorCenter - cross

  return { x, y, placement: joinPlacement(side, align), side, align, crossAxisAnchorLine }
}

/**
 * Positions an arrow box on the content edge facing the anchor, centered on
 * the anchor line and clamped away from the corners. `left`/`top` are
 * relative to the content's origin; the arrow box is `arrowSize` square and
 * sits fully OUTSIDE the content edge (offset by its full size on top/left,
 * flush after the far edge on bottom/right — pinned by tests). Rotate or
 * border-triangle it in the renderer; overlap the seam there if needed.
 */
export function computeArrowPosition(params: ComputeArrowPositionParams): ArrowPosition {
  const { side, size, crossAxisAnchorLine, arrowSize } = params
  const edgePadding = params.edgePadding ?? DEFAULT_ARROW_EDGE_PADDING
  const edge = oppositeSide(side)
  const crossLength = isVertical(side) ? size.width : size.height
  const cross = clamp(crossAxisAnchorLine - arrowSize / 2, {
    min: edgePadding,
    max: crossLength - arrowSize - edgePadding,
  })

  if (edge === 'top') {
    return { left: cross, top: -arrowSize, edge }
  }
  if (edge === 'bottom') {
    return { left: cross, top: size.height, edge }
  }
  if (edge === 'left') {
    return { left: -arrowSize, top: cross, edge }
  }
  return { left: size.width, top: cross, edge }
}
