import { TouchableArea } from '@universe/mycelium'
import type { NftViewLongPressAreaProps } from 'uniswap/src/components/nfts/NftViewLongPressArea'

export function NftViewLongPressArea({
  onPress,
  onLongPress,
  testID,
  children,
}: NftViewLongPressAreaProps): JSX.Element {
  return (
    <TouchableArea activeOpacity={1} testID={testID} onLongPress={onLongPress} onPress={onPress}>
      {children}
    </TouchableArea>
  )
}
