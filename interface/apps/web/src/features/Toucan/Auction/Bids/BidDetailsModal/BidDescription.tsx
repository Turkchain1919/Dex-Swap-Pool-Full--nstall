import { Text } from '@universe/mycelium'
import type { ReactNode } from 'react'

interface BidDescriptionProps {
  description: ReactNode
}

export function BidDescription({ description }: BidDescriptionProps): JSX.Element {
  return (
    <Text variant="body4" color="$neutral2">
      {description}
    </Text>
  )
}
