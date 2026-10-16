/**
 * INFRA-2965: behavioral contract of the native floating-overlay primitive,
 * run under react-test-renderer with a minimal react-native stand-in
 * (measurement injected via createNodeMock). Committed failing before the
 * implementation (proof-first).
 */
import { createElement, type JSX } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FloatingOverlayAnchor,
  FloatingOverlayArrow,
  FloatingOverlayContent,
  FloatingOverlayProvider,
  FloatingOverlayRoot,
  useFloatingOverlayState,
} from './FloatingOverlay.native'
import { __backPressHandlerCount, __resetBackPressHandlers, __triggerBackPress } from './testing/react-native-mock'
import { FLOATING_OVERLAY_LAYER_TEST_ID } from './types'
import type { FloatingOverlayContentProps, FloatingOverlayRootProps } from './types'

vi.mock('react-native', () => import('./testing/react-native-mock'))

// react-test-renderer's act() needs the explicit opt-in outside jsdom setups.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
}

/** Window rects served to `measureInWindow`, keyed by testID. */
const WINDOW_RECTS: Record<string, LayoutRect> = {}

const LAYER_RECT = { x: 0, y: 0, width: 400, height: 800 }
const ANCHOR_RECT = { x: 100, y: 100, width: 40, height: 20 }
const CONTENT_SIZE = { width: 80, height: 30 }

/** `ReactElement.props` is `unknown`, so narrow before reading the testID. */
function testIDOf(props: unknown): string {
  if (props !== null && typeof props === 'object' && 'testID' in props) {
    const { testID } = props
    return typeof testID === 'string' ? testID : ''
  }
  return ''
}

function renderTree(ui: JSX.Element): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined
  act(() => {
    renderer = create(ui, {
      createNodeMock: (element) => ({
        measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void): void => {
          const rect = WINDOW_RECTS[testIDOf(element.props)] ?? { x: 0, y: 0, width: 0, height: 0 }
          callback(rect.x, rect.y, rect.width, rect.height)
        },
      }),
    })
  })
  if (!renderer) {
    throw new Error('renderer not created')
  }
  return renderer
}

/** Host elements only — component instances carry the same testID prop and would double-match. */
function findAllHostsByTestID(renderer: ReactTestRenderer, testID: string): ReactTestInstance[] {
  return renderer.root.findAll((node) => typeof node.type === 'string' && node.props['testID'] === testID)
}

function findHostByTestID(renderer: ReactTestRenderer, testID: string): ReactTestInstance {
  const matches = findAllHostsByTestID(renderer, testID)
  const match = matches.length === 1 ? matches[0] : undefined
  if (!match) {
    throw new Error(`expected exactly one host with testID ${testID}, found ${matches.length}`)
  }
  return match
}

/** Host props are an open index signature, so the handler types are asserted at the read. */
function onLayoutOf(instance: ReactTestInstance): (event: { nativeEvent: { layout: LayoutRect } }) => void {
  return instance.props['onLayout'] as (event: { nativeEvent: { layout: LayoutRect } }) => void
}

function onPressOf(instance: ReactTestInstance): () => void {
  return instance.props['onPress'] as () => void
}

function fireLayerLayout(renderer: ReactTestRenderer): void {
  const layer = findHostByTestID(renderer, FLOATING_OVERLAY_LAYER_TEST_ID)
  act(() => {
    onLayoutOf(layer)({
      nativeEvent: { layout: { x: 0, y: 0, width: LAYER_RECT.width, height: LAYER_RECT.height } },
    })
  })
}

function fireContentLayout(renderer: ReactTestRenderer, size = CONTENT_SIZE): void {
  const content = findHostByTestID(renderer, 'content')
  act(() => {
    onLayoutOf(content)({ nativeEvent: { layout: { x: 0, y: 0, ...size } } })
  })
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((merged, entry) => ({ ...merged, ...flattenStyle(entry) }), {})
  }
  if (style && typeof style === 'object') {
    return style as Record<string, unknown>
  }
  return {}
}

/** Flattened `style` of a host instance; keys are read with bracket notation (open index signature). */
function hostStyle(instance: ReactTestInstance): Record<string, unknown> {
  return flattenStyle(instance.props['style'])
}

interface HarnessProps {
  root?: Partial<FloatingOverlayRootProps>
  content?: Partial<FloatingOverlayContentProps>
  contentChildren?: JSX.Element
  withAnchor?: boolean
}

function Harness({ root, content, contentChildren, withAnchor = true }: HarnessProps): JSX.Element {
  return (
    <FloatingOverlayProvider>
      <FloatingOverlayRoot open {...root}>
        {withAnchor ? <FloatingOverlayAnchor testID="anchor" /> : null}
        <FloatingOverlayContent testID="content" {...content}>
          {contentChildren}
        </FloatingOverlayContent>
      </FloatingOverlayRoot>
    </FloatingOverlayProvider>
  )
}

function renderOpenAndMeasured(props: HarnessProps = {}): ReactTestRenderer {
  const renderer = renderTree(<Harness {...props} />)
  fireLayerLayout(renderer)
  fireContentLayout(renderer)
  return renderer
}

beforeEach(() => {
  for (const key of Object.keys(WINDOW_RECTS)) {
    delete WINDOW_RECTS[key]
  }
  WINDOW_RECTS[FLOATING_OVERLAY_LAYER_TEST_ID] = LAYER_RECT
  WINDOW_RECTS['anchor'] = ANCHOR_RECT
  __resetBackPressHandlers()
})

describe('FloatingOverlayContent', () => {
  it('renders nothing while closed', () => {
    const renderer = renderTree(<Harness root={{ open: false }} />)
    expect(findAllHostsByTestID(renderer, 'content')).toHaveLength(0)
  })

  it('portals into the provider layer and positions against the measured anchor', () => {
    const renderer = renderOpenAndMeasured()
    const content = findHostByTestID(renderer, 'content')
    const style = hostStyle(content)
    // Geometry contract: bottom-center of a 40x20 anchor at (100,100).
    expect(style['left']).toBe(80)
    expect(style['top']).toBe(120)
    expect(style['opacity']).toBe(1)
    expect(style['position']).toBe('absolute')
  })

  it('hides the content (opacity 0) until it has been measured', () => {
    const renderer = renderTree(<Harness />)
    fireLayerLayout(renderer)
    const content = findHostByTestID(renderer, 'content')
    expect(hostStyle(content)['opacity']).toBe(0)
  })

  it('translates window coordinates into the overlay layer space', () => {
    WINDOW_RECTS[FLOATING_OVERLAY_LAYER_TEST_ID] = { x: 0, y: 50, width: 400, height: 750 }
    const renderer = renderOpenAndMeasured()
    const style = hostStyle(findHostByTestID(renderer, 'content'))
    // Anchor at window y=100 is at layer-local y=50.
    expect(style['top']).toBe(70)
  })

  it('flips to the top when the anchor sits near the bottom edge', () => {
    WINDOW_RECTS['anchor'] = { x: 100, y: 760, width: 40, height: 20 }
    const renderer = renderOpenAndMeasured()
    const style = hostStyle(findHostByTestID(renderer, 'content'))
    expect(style['top']).toBe(730)
  })

  it('positions from a virtual point anchor without an Anchor element', () => {
    const renderer = renderOpenAndMeasured({ root: { anchorPoint: { x: 200, y: 300 } }, withAnchor: false })
    const style = hostStyle(findHostByTestID(renderer, 'content'))
    expect(style['left']).toBe(160)
    expect(style['top']).toBe(300)
  })

  it('applies zIndex to the overlay wrapper (layer sibling) and custom style to the content', () => {
    const renderer = renderOpenAndMeasured({ content: { zIndex: 1070, style: { maxWidth: 240 } } })
    const layer = findHostByTestID(renderer, FLOATING_OVERLAY_LAYER_TEST_ID)
    const content = findHostByTestID(renderer, 'content')
    // Walk up to the overlay's wrapper — the direct child of the layer. The
    // zIndex must land THERE: wrappers are siblings, so only they can
    // reorder whole overlays.
    let wrapper = content
    while (wrapper.parent && wrapper.parent !== layer) {
      wrapper = wrapper.parent
    }
    expect(wrapper.parent).toBe(layer)
    expect(hostStyle(wrapper)['zIndex']).toBe(1070)
    const contentStyle = hostStyle(content)
    expect(contentStyle['maxWidth']).toBe(240)
    expect(contentStyle['zIndex']).toBeUndefined()
  })

  it('warns in dev when open with neither an Anchor nor anchorPoint (content would stay hidden)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderTree(<Harness withAnchor={false} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('FloatingOverlayAnchor'))
    warn.mockRestore()
  })

  it('does not warn when a virtual anchorPoint is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderTree(<Harness withAnchor={false} root={{ anchorPoint: { x: 10, y: 10 } }} />)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('throws without a FloatingOverlayProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      renderTree(
        <FloatingOverlayRoot open>
          <FloatingOverlayContent testID="content" />
        </FloatingOverlayRoot>,
      ),
    ).toThrowError(/FloatingOverlayProvider/)
    consoleError.mockRestore()
  })

  it('throws without a FloatingOverlayRoot', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      renderTree(
        <FloatingOverlayProvider>
          <FloatingOverlayContent testID="content" />
        </FloatingOverlayProvider>,
      ),
    ).toThrowError(/FloatingOverlayRoot/)
    consoleError.mockRestore()
  })
})

describe('dismissal', () => {
  it('closes on backdrop press (uncontrolled) and reports onOpenChange', () => {
    const onOpenChange = vi.fn()
    const onPressOutside = vi.fn()
    const renderer = renderOpenAndMeasured({
      root: { open: undefined, defaultOpen: true, onOpenChange },
      content: { onPressOutside },
    })
    const backdrop = findHostByTestID(renderer, 'content-backdrop')
    act(() => {
      onPressOf(backdrop)()
    })
    expect(onPressOutside).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(findAllHostsByTestID(renderer, 'content')).toHaveLength(0)
  })

  it('mounts the backdrop only once the overlay is positioned (open-but-unmeasured passes touches through)', () => {
    const renderer = renderTree(<Harness />)
    fireLayerLayout(renderer)
    // Open but the content has not been measured: no full-screen touch
    // absorber may exist yet.
    expect(findAllHostsByTestID(renderer, 'content-backdrop')).toHaveLength(0)
    fireContentLayout(renderer)
    expect(findAllHostsByTestID(renderer, 'content-backdrop')).toHaveLength(1)
  })

  it('renders no backdrop when dismissOnPressOutside is false', () => {
    const renderer = renderOpenAndMeasured({ content: { dismissOnPressOutside: false } })
    expect(findAllHostsByTestID(renderer, 'content-backdrop')).toHaveLength(0)
  })

  it('closes on Android back press and consumes the event', () => {
    const onOpenChange = vi.fn()
    renderOpenAndMeasured({ root: { open: undefined, defaultOpen: true, onOpenChange } })
    let consumed = false
    act(() => {
      consumed = __triggerBackPress()
    })
    expect(consumed).toBe(true)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(__backPressHandlerCount()).toBe(0)
  })

  it('ignores back press when dismissOnBackPress is false', () => {
    renderOpenAndMeasured({ content: { dismissOnBackPress: false } })
    expect(__backPressHandlerCount()).toBe(0)
    expect(__triggerBackPress()).toBe(false)
  })

  it('unsubscribes from back press when closed by the parent', () => {
    const renderer = renderOpenAndMeasured()
    expect(__backPressHandlerCount()).toBe(1)
    act(() => {
      renderer.update(<Harness root={{ open: false }} />)
    })
    expect(__backPressHandlerCount()).toBe(0)
    expect(findAllHostsByTestID(renderer, 'content')).toHaveLength(0)
  })
})

describe('FloatingOverlayArrow', () => {
  it('renders on the anchor-facing edge, centered on the anchor line', () => {
    const renderer = renderOpenAndMeasured({
      contentChildren: <FloatingOverlayArrow color="#123456" testID="arrow" />,
    })
    const arrow = findHostByTestID(renderer, 'arrow')
    const style = hostStyle(arrow)
    // Content sits below the anchor: arrow on the content's top edge.
    expect(style['left']).toBe(34)
    expect(style['top']).toBe(-12)
    expect(style['borderBottomColor']).toBe('#123456')
  })

  it('renders nothing until the content is measured', () => {
    const renderer = renderTree(<Harness contentChildren={<FloatingOverlayArrow color="#123456" testID="arrow" />} />)
    fireLayerLayout(renderer)
    expect(findAllHostsByTestID(renderer, 'arrow')).toHaveLength(0)
  })
})

describe('useFloatingOverlayState', () => {
  it('works inside portaled content (root context crosses the portal boundary)', () => {
    function DismissButton(): JSX.Element {
      const { setOpen } = useFloatingOverlayState()
      return createElement('DismissButton', {
        testID: 'dismiss',
        onPress: (): void => setOpen(false),
      })
    }
    const renderer = renderTree(
      <FloatingOverlayProvider>
        <FloatingOverlayRoot defaultOpen>
          <FloatingOverlayAnchor testID="anchor" />
          <FloatingOverlayContent testID="content">
            <DismissButton />
          </FloatingOverlayContent>
        </FloatingOverlayRoot>
      </FloatingOverlayProvider>,
    )
    fireLayerLayout(renderer)
    expect(findAllHostsByTestID(renderer, 'content')).toHaveLength(1)
    act(() => {
      onPressOf(findHostByTestID(renderer, 'dismiss'))()
    })
    expect(findAllHostsByTestID(renderer, 'content')).toHaveLength(0)
  })

  it('lets a trigger inside the root toggle the overlay', () => {
    function Trigger(): JSX.Element {
      const { open, setOpen } = useFloatingOverlayState()
      return createElement('Trigger', {
        testID: 'trigger',
        onPress: (): void => setOpen(!open),
      })
    }
    const renderer = renderTree(
      <FloatingOverlayProvider>
        <FloatingOverlayRoot defaultOpen={false}>
          <FloatingOverlayAnchor testID="anchor" />
          <Trigger />
          <FloatingOverlayContent testID="content" />
        </FloatingOverlayRoot>
      </FloatingOverlayProvider>,
    )
    fireLayerLayout(renderer)
    expect(findAllHostsByTestID(renderer, 'content')).toHaveLength(0)
    act(() => {
      onPressOf(findHostByTestID(renderer, 'trigger'))()
    })
    expect(findAllHostsByTestID(renderer, 'content')).toHaveLength(1)
  })
})
