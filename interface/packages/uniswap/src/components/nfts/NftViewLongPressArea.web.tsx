import { TouchableArea } from '@universe/mycelium'
import type { NftViewLongPressAreaProps } from 'uniswap/src/components/nfts/NftViewLongPressArea'

// Web opens the NFT context menu via ContextMenu's click trigger, not long press — plain
// touchable with no gesture wiring keeps react-native-gesture-handler out of web/extension bundles.
// Presses must bubble: the web portfolio NFTCard wraps this in its own TouchableArea and owns the
// card-wide press, so swallowing the event here would make taps on the NFT image do nothing.
export function NftViewLongPressArea({ onPress, testID, children }: NftViewLongPressAreaProps): JSX.Element {
  return (
    <TouchableArea activeOpacity={1} shouldStopPropagation={false} testID={testID} onPress={onPress}>
      {children}
    </TouchableArea>
  )
}
