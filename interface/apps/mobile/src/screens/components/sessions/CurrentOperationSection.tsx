import { Flex, Text } from '@universe/mycelium'
import React, { memo } from 'react'
import { useSessionsDebugStore } from 'src/screens/stores/sessionsDebugStore'

export const CurrentOperationSection = memo(function CurrentOperationSection(): JSX.Element | null {
  const currentOperation = useSessionsDebugStore((state) => state.currentOperation)

  if (!currentOperation) {
    return null
  }

  return (
    <Flex backgroundColor="$surface2" p="$spacing12" borderRadius="$rounded12">
      <Text variant="body2" color="$accent1">
        {currentOperation}
      </Text>
    </Flex>
  )
})
