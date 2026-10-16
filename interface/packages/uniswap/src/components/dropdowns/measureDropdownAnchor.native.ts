import type { DropdownAnchorNode, MeasuredAnchor } from 'uniswap/src/components/dropdowns/measureDropdownAnchor.types'
import { warnUnmeasurableAnchor } from 'uniswap/src/components/dropdowns/measureDropdownAnchor.warn'

/** Native hosts keep RN's own window-space measurement. */
export function measureDropdownAnchor(node: DropdownAnchorNode, onMeasured: (anchor: MeasuredAnchor) => void): void {
  if (node === null) {
    return
  }
  if (!('measureInWindow' in node)) {
    warnUnmeasurableAnchor('native', 'measureInWindow')
    return
  }
  // oxlint-disable-next-line max-params -- react-native measureInWindow callback shape
  node.measureInWindow((x, y, width, height) => {
    onMeasured({ x, y, width, height })
  })
}
