import { type FlexProps } from '@universe/mycelium'
import type { SharedValue } from 'react-native-reanimated'

export type ScrollbarProps = FlexProps & {
  visibleHeight: number
  contentHeight: number
  scrollOffset: SharedValue<number>
}

export function Scrollbar(_props: ScrollbarProps): JSX.Element {
  throw new Error('Scrollbar: Implemented in .native.tsx and .web.tsx')
}
