/**
 * INFRA-3118 review finding: EdgeFade.web.tsx's entire visual output is an
 * inline `background: linear-gradient(...)` passed via `style` to mycelium's
 * compat `Flex`. This proves the gradient survives Flex's style handling.
 *
 * Renders with `react-test-renderer` rather than the jsdom-DOM `render` from
 * `uniswap/src/test/test-utils` used by the sibling `EdgeFade.test.tsx`
 * snapshots deliberately: jsdom's CSSStyleDeclaration (`cssstyle`) silently
 * drops `background` shorthand values it cannot parse (e.g. `linear-gradient`
 * with an rgba() color stop), so a jsdom-rendered snapshot can show a missing
 * `background` in `style="..."` even when the React prop object passed to the
 * host `div` is correct — a false negative, not evidence of clobbering. This
 * is exactly why the earlier jsdom snapshots could not confirm merge-vs-clobber
 * either way. react-test-renderer never touches a real DOM/CSSOM: it records
 * the React element tree's props verbatim, so `host.props.style` here is the
 * literal object `createCompatComponent` (packages/mycelium/src/compat/dom.tsx)
 * builds via `mergeCompatStyle(emission.style, style)` — the ground truth for
 * whether Flex merges or clobbers the caller's `style` prop.
 */
import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { EdgeFade } from 'uniswap/src/features/fiatOnRamp/EdgeFade/EdgeFade.web'
// react-test-renderer's act() needs the explicit opt-in outside jsdom test setups.
import { describe, expect, it } from 'vitest'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function renderHostDiv(side: 'left' | 'right'): { style: Record<string, unknown>; unmount: () => void } {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = create(createElement(EdgeFade, { side }))
  })
  if (tree === undefined) {
    throw new Error('EdgeFade did not render')
  }
  const mounted = tree
  const host = mounted.root.findByType('div')
  return {
    style: host.props['style'] as Record<string, unknown>,
    unmount: (): void => {
      act(() => {
        mounted.unmount()
      })
    },
  }
}

describe('EdgeFade web — compat Flex style merge', () => {
  it.each(['left', 'right'] as const)('preserves the inline gradient background for side=%s', (side) => {
    const { style, unmount } = renderHostDiv(side)

    // EdgeFade's own inline declaration — the entire visual output of the
    // component — must survive the compat Flex style merge, proving Flex
    // doesn't clobber the caller's `style` prop.
    expect(typeof style['background']).toBe('string')
    expect(style['background']).toContain('linear-gradient(')
    expect(style['background']).toContain(side === 'left' ? '90deg' : '270deg')

    unmount()
  })
})
