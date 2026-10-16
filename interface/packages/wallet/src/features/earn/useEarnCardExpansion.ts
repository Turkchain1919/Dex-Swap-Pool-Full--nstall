import { useEffect } from 'react'
import { useBooleanState } from 'utilities/src/react/useBooleanState'

export function useEarnCardExpansion({
  earnCardExpansionRequestId,
  onEarnCardExpansionRequestHandled,
}: {
  earnCardExpansionRequestId?: number
  onEarnCardExpansionRequestHandled?: (requestId: number) => void
}): { isExpanded: boolean; toggleExpanded: () => void } {
  const {
    value: isExpanded,
    setTrue: expand,
    toggle: toggleExpanded,
  } = useBooleanState(earnCardExpansionRequestId !== undefined)

  useEffect(() => {
    if (earnCardExpansionRequestId !== undefined) {
      expand()
      onEarnCardExpansionRequestHandled?.(earnCardExpansionRequestId)
    }
  }, [earnCardExpansionRequestId, expand, onEarnCardExpansionRequestHandled])

  return { isExpanded, toggleExpanded }
}
