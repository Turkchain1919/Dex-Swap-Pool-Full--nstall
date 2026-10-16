/**
 * Behavior pins for the web DynamicSizeText fit (the legacy
 * `ui/src/components/text/DynamicSizeText/DynamicSizeText.web.tsx` loop):
 * binary search on a 2px grain against a canvas measurement of a zero-height
 * measuring row. jsdom implements neither Canvas 2D nor ResizeObserver, so
 * both are stubbed — the canvas stub's width model (0.5px per character per
 * font px) makes every expected size below an independent hand-derivation.
 */
import { cleanup, render, screen } from '@testing-library/react'
// The legacy fallback stack's source of truth — the drift pin below reads it
// from `packages/ui` (jsdom is a web platform, so this is the web value).
import { baselBook } from 'ui/src/theme/fonts'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { DynamicSizeTextCompat } from './DynamicSizeTextCompat.web'

let containerWidth = 60
let lastCanvasFont = ''

const canvasProto = HTMLCanvasElement.prototype
const originalGetContext = canvasProto.getContext

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })),
  )

  canvasProto.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
    if (contextId === '2d') {
      let font = ''
      return {
        get font(): string {
          return font
        },
        set font(value: string) {
          font = value
          lastCanvasFont = value
        },
        measureText(text: string): TextMetrics {
          const px = Number.parseInt(/^(\d+)px/.exec(font)?.[1] ?? '16', 10)
          return { width: text.length * px * 0.5 } as TextMetrics
        },
      } as unknown as CanvasRenderingContext2D
    }
    return originalGetContext.call(this, contextId, ...(args as []))
  } as typeof originalGetContext

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ width: containerWidth, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0 }) as DOMRect,
  )
})

afterEach(() => {
  cleanup()
  containerWidth = 60
})

afterAll(() => {
  canvasProto.getContext = originalGetContext
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('DynamicSizeTextCompat (web fit)', () => {
  it('picks the largest 2px-grain size that fits the measured width', () => {
    // 8 chars at 0.5px/char/px = 4px of text per font px; 60px fits up to
    // 15px, so the largest even size in the default [8, 16] range is 14.
    render(<DynamicSizeTextCompat testID="fit">12345678</DynamicSizeTextCompat>)
    expect(screen.getByTestId('fit').style.fontSize).toBe('14px')
  })

  it('respects call-site fit bounds', () => {
    // 9 chars in 200px fits up to 44px, above the cap — clamps to the max.
    containerWidth = 200
    render(
      <DynamicSizeTextCompat testID="fit" minWebFontSize={24} maxWebFontSize={36}>
        hello.uni
      </DynamicSizeTextCompat>,
    )
    expect(screen.getByTestId('fit').style.fontSize).toBe('36px')
  })

  it('bottoms out at minWebFontSize when nothing fits', () => {
    containerWidth = 1
    render(<DynamicSizeTextCompat testID="fit">12345678</DynamicSizeTextCompat>)
    expect(screen.getByTestId('fit').style.fontSize).toBe('8px')
  })

  it('applies the single-line truncation styles alongside the fitted size', () => {
    render(<DynamicSizeTextCompat testID="fit">12345678</DynamicSizeTextCompat>)
    const { style } = screen.getByTestId('fit')
    expect(style.whiteSpace).toBe('nowrap')
    expect(style.textOverflow).toBe('ellipsis')
    expect(style.overflow).toBe('hidden')
  })

  it('measures with the legacy web body font stack by default', () => {
    render(<DynamicSizeTextCompat>12345678</DynamicSizeTextCompat>)
    // Expectation read from the legacy source (`baselBook`), not from the
    // implementation's transcribed literal — drift on either side fails here.
    expect(lastCanvasFont).toContain(`px ${baselBook}`)
  })

  it('measures with the style-prop font family when one is set', () => {
    render(<DynamicSizeTextCompat style={{ fontFamily: 'TestFont' }}>12345678</DynamicSizeTextCompat>)
    expect(lastCanvasFont).toMatch(/px TestFont$/)
  })

  it('flattens an RN-style array: measures with its font family and renders its declarations', () => {
    render(
      <DynamicSizeTextCompat testID="fit" style={[{ fontFamily: 'ArrayFont' }, { letterSpacing: '2px' }]}>
        12345678
      </DynamicSizeTextCompat>,
    )
    expect(lastCanvasFont).toMatch(/px ArrayFont$/)
    const { style } = screen.getByTestId('fit')
    expect(style.fontFamily).toBe('ArrayFont')
    expect(style.letterSpacing).toBe('2px')
    expect(style.fontSize).toBe('14px')
  })

  it('mounts the floating suffix in both the measuring row and the visible row', () => {
    render(<DynamicSizeTextCompat floatingSuffix={<span data-testid="suffix" />}>12345678</DynamicSizeTextCompat>)
    expect(screen.getAllByTestId('suffix')).toHaveLength(2)
  })
})
