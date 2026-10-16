import type { View } from 'react-native'

export interface MeasuredAnchor {
  x: number
  y: number
  width: number
  height: number
}

/** The two host shapes the anchor ref can hold: an RN host on native, a DOM element on web. */
export type DropdownAnchorNode = View | HTMLElement | null
