import { Text } from '@universe/mycelium'
import { EM_DASH } from 'ui/src'

export function EmptyCell(): JSX.Element {
  return (
    <Text variant="body3" color="$neutral3">
      {EM_DASH}
    </Text>
  )
}
