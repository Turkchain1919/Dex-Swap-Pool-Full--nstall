import { render, screen } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { WidthAnimator } from './WidthAnimator.native'

// Mycelium has no native-runtime test lane: like the sibling native splits
// (HeightAnimator.native.test.tsx, FloatingOverlay.native.test.tsx) this runs
// in the package's jsdom vitest with react-native stood in — the contract
// under test is the stub's own branching, not RN rendering.
vi.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
  },
  View: ({ children, style }: { children?: ReactNode; style?: unknown }): ReactElement => (
    <div data-testid="native-view" data-style={JSON.stringify(style)}>
      {children}
    </div>
  ),
}))

/** The stub passes `style={[open|closed, dynamic]}` — flatten the recorded array for assertions. */
function containerStyle(): Record<string, unknown> {
  const raw = screen.getByTestId('native-view').dataset['style']
  if (!raw) {
    throw new Error('native View rendered without a style prop')
  }
  const parsed: unknown = JSON.parse(raw)
  const layers = Array.isArray(parsed) ? parsed : [parsed]
  return layers.reduce<Record<string, unknown>>((merged, layer) => {
    if (layer && typeof layer === 'object') {
      return { ...merged, ...(layer as Record<string, unknown>) }
    }
    return merged
  }, {})
}

describe('WidthAnimator (native stub)', () => {
  it('renders children at contentWidth and the fixed height when open (default)', () => {
    render(
      <WidthAnimator height={288} contentWidth={504}>
        <span data-testid="child">content</span>
      </WidthAnimator>,
    )
    expect(screen.queryByTestId('child')).not.toBeNull()
    expect(containerStyle()).toMatchObject({ height: 288, overflow: 'visible', width: 504 })
  })

  it('collapses to width 0 instantly when closed, clipping overflow and keeping children mounted', () => {
    render(
      <WidthAnimator open={false} height={288} contentWidth={504}>
        <span data-testid="child">content</span>
      </WidthAnimator>,
    )
    expect(containerStyle()).toMatchObject({ height: 288, overflow: 'hidden', width: 0 })
    expect(screen.queryByTestId('child')).not.toBeNull()
  })

  it('falls back to natural width when open without contentWidth', () => {
    render(
      <WidthAnimator height={288}>
        <span>content</span>
      </WidthAnimator>,
    )
    // width undefined → RN default (auto).
    expect(containerStyle()['width']).toBeUndefined()
  })

  it('applies mt as a pixel margin-top', () => {
    render(
      <WidthAnimator height={288} contentWidth={504} mt={42}>
        <span>content</span>
      </WidthAnimator>,
    )
    expect(containerStyle()).toMatchObject({ marginTop: 42 })
  })
})
