import { useState } from 'react'
import { useEvent } from 'utilities/src/react/hooks'

/**
 * Semi-controlled open state, like the legacy `TooltipBase`: a caller-provided
 * `open` stays fully controlled (changes only flow through `onOpenChange`);
 * otherwise the hook owns the state itself. The Root always drives Base UI
 * with the returned value, so the trigger's touch affordance always has a
 * `requestOpenChange` to call — Base UI's own hover is mouse-only.
 */
export function useControllableOpen({
  open,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}): [boolean, (nextOpen: boolean) => void] {
  const isControlled = open !== undefined
  const [internalOpen, setInternalOpen] = useState(open ?? false)
  const currentOpen = isControlled ? open : internalOpen
  const requestOpenChange = useEvent((nextOpen: boolean): void => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  })
  return [currentOpen, requestOpenChange]
}
