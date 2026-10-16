/**
 * The web leg's contract is that it is a TRUE document-level portal: the
 * rendered subtree's DOM parent is `document.body`, not the element it was
 * written inside. These tests assert that against an ancestor that creates a
 * stacking context and a containing block (`transform`), which is the exact
 * situation the call sites moving onto this primitive are escaping.
 */
import { render, screen } from '@testing-library/react'
import { createContext, useContext } from 'react'
import { describe, expect, it } from 'vitest'
import { Portal, PortalProvider } from './Portal.web'
import { PORTAL_DEFAULT_Z_INDEX, PORTAL_STACK_LAYER_STEP } from './stack'

function TransformedAncestor({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div data-testid="transformed-ancestor" style={{ transform: 'translateZ(0)', overflow: 'hidden', zIndex: 0 }}>
      {children}
    </div>
  )
}

/** The wrapper span the portal renders directly under `<body>`. */
function portalWrapper(testId: string): HTMLElement {
  const content = screen.getByTestId(testId)
  const wrapper = content.parentElement
  if (!wrapper) {
    throw new Error('portal content has no wrapper')
  }
  return wrapper
}

describe('Portal (web)', () => {
  it('renders its children into document.body, not into its writing position', () => {
    render(
      <TransformedAncestor>
        <Portal>
          <div data-testid="overlay">overlay</div>
        </Portal>
      </TransformedAncestor>,
    )

    expect(portalWrapper('overlay').parentElement).toBe(document.body)
    expect(screen.getByTestId('transformed-ancestor').contains(screen.getByTestId('overlay'))).toBe(false)
  })

  it('gives the wrapper the full-window, contained, click-through layer styles', () => {
    render(
      <Portal>
        <div data-testid="overlay">overlay</div>
      </Portal>,
    )

    const { style } = portalWrapper('overlay')
    expect(style.position).toBe('fixed')
    expect(style.inset).toMatch(/^0(px)?$/)
    expect(style.contain).toBe('strict')
    expect(style.pointerEvents).toBe('none')
  })

  it('applies an explicit zIndex to the wrapper', () => {
    render(
      <Portal zIndex={100020}>
        <div data-testid="overlay">overlay</div>
      </Portal>,
    )

    expect(portalWrapper('overlay').style.zIndex).toBe('100020')
  })

  it('defaults to the unstacked z-index when neither prop is given', () => {
    render(
      <Portal>
        <div data-testid="overlay">overlay</div>
      </Portal>,
    )

    expect(portalWrapper('overlay').style.zIndex).toBe(String(PORTAL_DEFAULT_Z_INDEX))
  })

  it('offsets a stackZIndex portal by the layer step', () => {
    render(
      <Portal stackZIndex={1070}>
        <div data-testid="overlay">overlay</div>
      </Portal>,
    )

    expect(portalWrapper('overlay').style.zIndex).toBe(String(1070 + PORTAL_STACK_LAYER_STEP + 1))
  })

  it('stacks a portal mounted later above one already on screen', () => {
    function App({ showSecond }: { showSecond: boolean }): React.JSX.Element {
      return (
        <PortalProvider>
          <Portal stackZIndex={1070}>
            <div data-testid="first">first</div>
          </Portal>
          {showSecond ? (
            <Portal stackZIndex={1070}>
              <div data-testid="second">second</div>
            </Portal>
          ) : null}
        </PortalProvider>
      )
    }

    const { rerender } = render(<App showSecond={false} />)
    rerender(<App showSecond />)

    const first = Number(portalWrapper('first').style.zIndex)
    const second = Number(portalWrapper('second').style.zIndex)

    expect(second).toBeGreaterThan(first)
  })

  it('gives two portals mounting in the same commit the same stacked z-index, as Tamagui did', () => {
    // Both resolve during the same render pass, before either effect has
    // registered, so neither can see the other. DOM order then decides.
    render(
      <PortalProvider>
        <Portal stackZIndex={1070}>
          <div data-testid="a">a</div>
        </Portal>
        <Portal stackZIndex={1070}>
          <div data-testid="b">b</div>
        </Portal>
      </PortalProvider>,
    )

    expect(portalWrapper('a').style.zIndex).toBe(portalWrapper('b').style.zIndex)
  })

  it('keeps two provider scopes from stacking against each other', () => {
    render(
      <>
        <PortalProvider>
          <Portal stackZIndex={1070}>
            <div data-testid="scoped-a">a</div>
          </Portal>
        </PortalProvider>
        <PortalProvider>
          <Portal stackZIndex={1070}>
            <div data-testid="scoped-b">b</div>
          </Portal>
        </PortalProvider>
      </>,
    )

    expect(portalWrapper('scoped-a').style.zIndex).toBe(portalWrapper('scoped-b').style.zIndex)
  })

  // The counterpart of the native leg's divergence test: on web, createPortal
  // relocates the subtree in the DOM only, so context still flows.
  it('sees context provided between the provider and the call site', () => {
    const ValueContext = createContext('from-provider-scope')

    function ShowValue(): React.JSX.Element {
      return <div data-testid="ctx-value">{useContext(ValueContext)}</div>
    }

    render(
      <PortalProvider>
        <ValueContext.Provider value="from-call-site-scope">
          <Portal>
            <ShowValue />
          </Portal>
        </ValueContext.Provider>
      </PortalProvider>,
    )

    expect(screen.getByTestId('ctx-value').textContent).toBe('from-call-site-scope')
  })

  it('resolves a stackZIndex change on a mounted portal against siblings, not itself', () => {
    function App({ stack }: { stack: number }): React.JSX.Element {
      return (
        <PortalProvider>
          <Portal stackZIndex={stack}>
            <div data-testid="overlay">overlay</div>
          </Portal>
        </PortalProvider>
      )
    }

    const { rerender } = render(<App stack={1070} />)
    expect(portalWrapper('overlay').style.zIndex).toBe(String(1070 + PORTAL_STACK_LAYER_STEP + 1))

    rerender(<App stack={1080} />)
    // Without the self-exclusion guard this compounds to 12152.
    expect(portalWrapper('overlay').style.zIndex).toBe(String(1080 + PORTAL_STACK_LAYER_STEP + 1))
  })

  it('does not let a zIndex+stackZIndex portal inflate a later sibling', () => {
    // The explicit zIndex wins, so this portal is unstacked and must not
    // become the ceiling the stacked sibling mounting after it measures against.
    function App({ showSecond }: { showSecond: boolean }): React.JSX.Element {
      return (
        <PortalProvider>
          <Portal stackZIndex={1070} zIndex={100020}>
            <div data-testid="explicit">explicit</div>
          </Portal>
          {showSecond ? (
            <Portal stackZIndex={1070}>
              <div data-testid="stacked">stacked</div>
            </Portal>
          ) : null}
        </PortalProvider>
      )
    }

    const { rerender } = render(<App showSecond={false} />)
    rerender(<App showSecond />)

    expect(portalWrapper('explicit').style.zIndex).toBe('100020')
    expect(portalWrapper('stacked').style.zIndex).toBe(String(1070 + PORTAL_STACK_LAYER_STEP + 1))
  })

  it('works without a provider', () => {
    render(
      <Portal zIndex={7}>
        <div data-testid="overlay">overlay</div>
      </Portal>,
    )

    expect(portalWrapper('overlay').parentElement).toBe(document.body)
    expect(portalWrapper('overlay').style.zIndex).toBe('7')
  })
})

describe('PortalProvider (web)', () => {
  it('mounts no host element of its own', () => {
    const { container } = render(
      <PortalProvider>
        <div data-testid="app">app</div>
      </PortalProvider>,
    )

    expect(container.innerHTML).toBe('<div data-testid="app">app</div>')
  })
})
