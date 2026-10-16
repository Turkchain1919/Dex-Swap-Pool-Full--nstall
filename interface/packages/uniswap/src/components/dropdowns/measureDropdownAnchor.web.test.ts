import { measureDropdownAnchor } from 'uniswap/src/components/dropdowns/measureDropdownAnchor.web'

describe('measureDropdownAnchor (web)', () => {
  it('reports the viewport-relative box the dropdown anchors against', () => {
    const node = document.createElement('div')
    node.getBoundingClientRect = (): DOMRect => ({ left: 12, top: 34, width: 100, height: 50 }) as DOMRect
    const onMeasured = vi.fn()

    measureDropdownAnchor(node, onMeasured)

    expect(onMeasured).toHaveBeenCalledWith({ x: 12, y: 34, width: 100, height: 50 })
  })

  it('no-ops on an unmounted ref instead of throwing', () => {
    // The pre-conversion code called `measureInWindow` straight off the ref, which the compat
    // primitives do not expose on web — that threw and the dropdown never opened. Non-host values
    // can no longer reach here at all: `DropdownAnchorNode` rejects them at compile time.
    const onMeasured = vi.fn()

    expect(() => measureDropdownAnchor(null, onMeasured)).not.toThrow()
    expect(onMeasured).not.toHaveBeenCalled()
  })
})
