import type { DropdownAnchorNode, MeasuredAnchor } from 'uniswap/src/components/dropdowns/measureDropdownAnchor.types'
import { warnUnmeasurableAnchor } from 'uniswap/src/components/dropdowns/measureDropdownAnchor.warn'

/**
 * The compat `Flex` forwards a raw `HTMLElement` on web — mycelium deliberately does not transcribe
 * RNW's `measure`/`measureInWindow` shims onto it — so the anchor box comes from
 * `getBoundingClientRect`, which reports the same viewport-relative geometry `measureInWindow` did.
 */
export function measureDropdownAnchor(node: DropdownAnchorNode, onMeasured: (anchor: MeasuredAnchor) => void): void {
  if (node === null) {
    return
  }
  if (!('getBoundingClientRect' in node)) {
    warnUnmeasurableAnchor('web', 'getBoundingClientRect')
    return
  }
  const rect = node.getBoundingClientRect()
  onMeasured({ x: rect.left, y: rect.top, width: rect.width, height: rect.height })
}
