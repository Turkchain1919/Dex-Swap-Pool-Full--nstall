/**
 * INFRA-2965: pins the pure positioning algebra of the native
 * floating-overlay primitive — placement parsing, physical offsets, flip,
 * cross-axis shift clamp, virtual point anchors, and arrow coordinates.
 * Committed failing before the implementation (proof-first).
 */
import { describe, expect, it } from 'vitest'
import {
  anchorRectFromPoint,
  computeArrowPosition,
  computeFloatingPosition,
  joinPlacement,
  resolveOffset,
  splitPlacement,
} from './geometry'

// A 40x20 anchor at (100, 100) inside a 400x800 layer, floating 80x30 content.
const ANCHOR = { x: 100, y: 100, width: 40, height: 20 }
const SIZE = { width: 80, height: 30 }
const VIEWPORT = { width: 400, height: 800 }

describe('splitPlacement', () => {
  it('defaults to bottom-center like Tamagui/floating-ui', () => {
    expect(splitPlacement(undefined)).toEqual({ side: 'bottom', align: 'center' })
  })

  it('parses a bare side as centered', () => {
    expect(splitPlacement('top')).toEqual({ side: 'top', align: 'center' })
    expect(splitPlacement('right')).toEqual({ side: 'right', align: 'center' })
  })

  it('parses -start and -end alignments', () => {
    expect(splitPlacement('bottom-start')).toEqual({ side: 'bottom', align: 'start' })
    expect(splitPlacement('left-end')).toEqual({ side: 'left', align: 'end' })
  })
})

describe('joinPlacement', () => {
  it('round-trips through splitPlacement', () => {
    expect(joinPlacement('bottom', 'center')).toBe('bottom')
    expect(joinPlacement('top', 'start')).toBe('top-start')
    expect(joinPlacement('right', 'end')).toBe('right-end')
  })
})

describe('resolveOffset', () => {
  it('treats undefined as zero on both axes', () => {
    expect(resolveOffset(undefined)).toEqual({ mainAxis: 0, crossAxis: 0 })
  })

  it('treats a number as main-axis only', () => {
    expect(resolveOffset(10)).toEqual({ mainAxis: 10, crossAxis: 0 })
  })

  it('fills missing object axes with zero', () => {
    expect(resolveOffset({ mainAxis: 4 })).toEqual({ mainAxis: 4, crossAxis: 0 })
    expect(resolveOffset({ crossAxis: -6 })).toEqual({ mainAxis: 0, crossAxis: -6 })
    expect(resolveOffset({ mainAxis: 2, crossAxis: 3 })).toEqual({ mainAxis: 2, crossAxis: 3 })
  })
})

describe('anchorRectFromPoint', () => {
  it('produces a zero-size rect at the point', () => {
    expect(anchorRectFromPoint({ x: 200, y: 300 })).toEqual({ x: 200, y: 300, width: 0, height: 0 })
  })
})

describe('computeFloatingPosition', () => {
  it('centers below the anchor by default', () => {
    const position = computeFloatingPosition({ anchor: ANCHOR, size: SIZE, viewport: VIEWPORT })
    // anchor center x = 120; content left = 120 - 40 = 80; top = 100 + 20.
    expect(position).toMatchObject({ x: 80, y: 120, placement: 'bottom', side: 'bottom', align: 'center' })
  })

  it('reports the anchor line relative to the content origin', () => {
    const position = computeFloatingPosition({ anchor: ANCHOR, size: SIZE, viewport: VIEWPORT })
    // anchor center (120) minus content left (80).
    expect(position.crossAxisAnchorLine).toBe(40)
  })

  it('places above for top', () => {
    const position = computeFloatingPosition({ anchor: ANCHOR, size: SIZE, viewport: VIEWPORT, placement: 'top' })
    expect(position).toMatchObject({ x: 80, y: 70, side: 'top' })
  })

  it('places beside for left and right (cross axis is vertical)', () => {
    const left = computeFloatingPosition({ anchor: ANCHOR, size: SIZE, viewport: VIEWPORT, placement: 'left' })
    // left = 100 - 80; top = anchor center y (110) - 15.
    expect(left).toMatchObject({ x: 20, y: 95, side: 'left' })
    expect(left.crossAxisAnchorLine).toBe(15)

    const right = computeFloatingPosition({ anchor: ANCHOR, size: SIZE, viewport: VIEWPORT, placement: 'right' })
    expect(right).toMatchObject({ x: 140, y: 95, side: 'right' })
  })

  it('aligns start and end edges', () => {
    const start = computeFloatingPosition({
      anchor: ANCHOR,
      size: SIZE,
      viewport: VIEWPORT,
      placement: 'bottom-start',
    })
    expect(start).toMatchObject({ x: 100, y: 120, align: 'start' })

    const end = computeFloatingPosition({ anchor: ANCHOR, size: SIZE, viewport: VIEWPORT, placement: 'bottom-end' })
    // anchor right edge (140) minus content width.
    expect(end).toMatchObject({ x: 60, y: 120, align: 'end' })
  })

  it('applies a numeric offset on the main axis away from the anchor', () => {
    const below = computeFloatingPosition({ anchor: ANCHOR, size: SIZE, viewport: VIEWPORT, offset: 10 })
    expect(below.y).toBe(130)

    const above = computeFloatingPosition({
      anchor: ANCHOR,
      size: SIZE,
      viewport: VIEWPORT,
      placement: 'top',
      offset: 10,
    })
    expect(above.y).toBe(60)
  })

  it('keeps crossAxis physical regardless of alignment (floating-ui semantics)', () => {
    // Positive crossAxis moves RIGHT for every bottom-* placement — including
    // -end, where the legacy Coachmark hook flips it (documented divergence).
    const start = computeFloatingPosition({
      anchor: ANCHOR,
      size: SIZE,
      viewport: VIEWPORT,
      placement: 'bottom-start',
      offset: { crossAxis: 5 },
    })
    expect(start.x).toBe(105)

    const end = computeFloatingPosition({
      anchor: ANCHOR,
      size: SIZE,
      viewport: VIEWPORT,
      placement: 'bottom-end',
      offset: { crossAxis: 5 },
    })
    expect(end.x).toBe(65)

    const rightSide = computeFloatingPosition({
      anchor: ANCHOR,
      size: SIZE,
      viewport: VIEWPORT,
      placement: 'right',
      offset: { crossAxis: 5 },
    })
    // Positive crossAxis moves DOWN for left/right placements.
    expect(rightSide.y).toBe(100)
  })

  it('flips to the opposite side when the requested side cannot fit', () => {
    const nearBottom = { x: 100, y: 760, width: 40, height: 20 }
    const position = computeFloatingPosition({ anchor: nearBottom, size: SIZE, viewport: VIEWPORT })
    // 800 - 780 - 8 = 12 < 30 below; above fits.
    expect(position).toMatchObject({ y: 730, placement: 'top', side: 'top' })
  })

  it('keeps the requested side when flip is disabled', () => {
    const nearBottom = { x: 100, y: 760, width: 40, height: 20 }
    const position = computeFloatingPosition({ anchor: nearBottom, size: SIZE, viewport: VIEWPORT, flip: false })
    expect(position).toMatchObject({ y: 780, side: 'bottom' })
  })

  it('flips to the larger side when neither side fits', () => {
    const viewport = { width: 400, height: 100 }
    const anchor = { x: 0, y: 10, width: 10, height: 20 }
    const size = { width: 10, height: 60 }
    // top space = 2, bottom space = 62: neither fits 60, bottom is larger.
    const position = computeFloatingPosition({ anchor, size, viewport, placement: 'top' })
    expect(position.side).toBe('bottom')
  })

  it('stays on the requested side when the opposite is no better', () => {
    const viewport = { width: 400, height: 100 }
    const anchor = { x: 0, y: 45, width: 10, height: 10 }
    const size = { width: 10, height: 60 }
    // top space = 37, bottom space = 37: equal, keep the request.
    const position = computeFloatingPosition({ anchor, size, viewport, placement: 'top' })
    expect(position.side).toBe('top')
  })

  it('accounts for the main-axis offset when measuring available space', () => {
    const anchor = { x: 100, y: 745, width: 40, height: 20 }
    // Below: 800 - 765 - 8 = 27 fits 20 only without the offset.
    const noOffset = computeFloatingPosition({ anchor, size: { width: 80, height: 25 }, viewport: VIEWPORT })
    expect(noOffset.side).toBe('bottom')
    const withOffset = computeFloatingPosition({
      anchor,
      size: { width: 80, height: 25 },
      viewport: VIEWPORT,
      offset: 10,
    })
    expect(withOffset.side).toBe('top')
  })

  it('shifts the content back inside the viewport padding on the cross axis', () => {
    const nearLeftEdge = { x: 0, y: 100, width: 10, height: 10 }
    const position = computeFloatingPosition({
      anchor: nearLeftEdge,
      size: { width: 100, height: 20 },
      viewport: VIEWPORT,
    })
    // raw left = 5 - 50 = -45, clamped to the 8px padding.
    expect(position.x).toBe(8)
    // Anchor line follows the shift: anchor center (5) - shifted left (8).
    expect(position.crossAxisAnchorLine).toBe(-3)
  })

  it('clamps against the far edge too', () => {
    const nearRightEdge = { x: 390, y: 100, width: 10, height: 10 }
    const position = computeFloatingPosition({
      anchor: nearRightEdge,
      size: { width: 100, height: 20 },
      viewport: VIEWPORT,
    })
    // max left = 400 - 100 - 8.
    expect(position.x).toBe(292)
  })

  it('honors a custom viewportPadding', () => {
    const nearLeftEdge = { x: 0, y: 100, width: 10, height: 10 }
    const position = computeFloatingPosition({
      anchor: nearLeftEdge,
      size: { width: 100, height: 20 },
      viewport: VIEWPORT,
      viewportPadding: 16,
    })
    expect(position.x).toBe(16)
  })

  it('pins oversized content to the start-edge padding (inverted clamp bounds contract)', () => {
    // Content wider than viewport - 2*padding (500 > 384): the shift range
    // collapses (max < min) and the deliberate contract pins to the START
    // edge, overflowing the far edge.
    const position = computeFloatingPosition({ anchor: ANCHOR, size: { width: 500, height: 20 }, viewport: VIEWPORT })
    expect(position.x).toBe(8)
    // Anchor line still tracks the anchor center relative to the pinned origin.
    expect(position.crossAxisAnchorLine).toBe(112)
  })

  it('positions from a virtual point anchor (openAt analog)', () => {
    const position = computeFloatingPosition({
      anchor: anchorRectFromPoint({ x: 200, y: 300 }),
      size: SIZE,
      viewport: VIEWPORT,
    })
    expect(position).toMatchObject({ x: 160, y: 300, side: 'bottom' })
    expect(position.crossAxisAnchorLine).toBe(40)
  })
})

describe('computeArrowPosition', () => {
  it('sits on the edge facing the anchor, centered on the anchor line', () => {
    const arrow = computeArrowPosition({
      side: 'bottom',
      size: SIZE,
      crossAxisAnchorLine: 40,
      arrowSize: 12,
    })
    // Content below the anchor: arrow on the content's TOP edge.
    expect(arrow).toEqual({ left: 34, top: -12, edge: 'top' })
  })

  it('handles every side', () => {
    expect(computeArrowPosition({ side: 'top', size: SIZE, crossAxisAnchorLine: 40, arrowSize: 12 })).toEqual({
      left: 34,
      top: 30,
      edge: 'bottom',
    })
    expect(computeArrowPosition({ side: 'left', size: SIZE, crossAxisAnchorLine: 15, arrowSize: 12 })).toEqual({
      left: 80,
      top: 9,
      edge: 'right',
    })
    expect(computeArrowPosition({ side: 'right', size: SIZE, crossAxisAnchorLine: 15, arrowSize: 12 })).toEqual({
      left: -12,
      top: 9,
      edge: 'left',
    })
  })

  it('clamps away from the corners', () => {
    const nearStart = computeArrowPosition({ side: 'bottom', size: SIZE, crossAxisAnchorLine: 2, arrowSize: 12 })
    expect(nearStart.left).toBe(8)
    const nearEnd = computeArrowPosition({ side: 'bottom', size: SIZE, crossAxisAnchorLine: 79, arrowSize: 12 })
    // 80 - 12 - 8.
    expect(nearEnd.left).toBe(60)
  })

  it('honors a custom edgePadding', () => {
    const arrow = computeArrowPosition({
      side: 'bottom',
      size: SIZE,
      crossAxisAnchorLine: 0,
      arrowSize: 12,
      edgePadding: 2,
    })
    expect(arrow.left).toBe(2)
  })

  it('pins to the start-edge padding when the arrow cannot fit between the corners (inverted clamp bounds contract)', () => {
    // Content only 20 wide: 20 - 12 - 8 = 0 < the 8px edge padding, so the
    // collapsed range pins to the start edge.
    const arrow = computeArrowPosition({
      side: 'bottom',
      size: { width: 20, height: 30 },
      crossAxisAnchorLine: 18,
      arrowSize: 12,
    })
    expect(arrow.left).toBe(8)
  })
})
