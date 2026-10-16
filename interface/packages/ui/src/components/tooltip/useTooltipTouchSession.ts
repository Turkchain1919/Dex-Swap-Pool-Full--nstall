import { type PointerEvent, type RefObject, useEffect, useState } from 'react'
import { TOOLTIP_POPUP_DATA_SLOT } from 'ui/src/components/tooltip/shared'
import { useEvent } from 'utilities/src/react/hooks'

/**
 * The trigger's touch-session state machine, extracted so the touch lifecycle can be
 * read and tested apart from the trigger's render branches.
 *
 * Touch affordance: Base UI's trigger hover is hard-coded `mouseOnly: true`
 * (TooltipTrigger.js), while the legacy floating-ui hover also opened on tap — so
 * non-mouse pointers open here directly. Dismissal must not ride pointerleave (a
 * touch pointer fires it as the finger lifts, which would self-dismiss the tip
 * right after opening); Base UI's engine never binds it either — its hover close is
 * the compat mouseleave the UA holds until the user moves on (immediate for touch:
 * the engine zeroes non-mouse hover delays). The tap-away here adds the legacy
 * lifecycle alongside that: a pointerdown outside the trigger and any tooltip popup
 * closes.
 */
export function useTooltipTouchSession({
  isOpen,
  requestOpenChange,
  triggerNodeRef,
}: {
  isOpen: boolean
  requestOpenChange: (nextOpen: boolean) => void
  triggerNodeRef: RefObject<HTMLDivElement | null>
}): { handleTouchPointerDown: (event: PointerEvent<HTMLElement>) => void } {
  const [isTouchOpened, setIsTouchOpened] = useState(false)
  const handleTouchPointerDown = useEvent((event: PointerEvent<HTMLElement>): void => {
    if (event.pointerType === 'mouse') {
      return
    }
    // `!isOpen` gates only the emit: it keeps a repeat tap on an already-open trigger
    // from re-emitting onOpenChange(true) (the root's handleOpenChange forwards
    // unconditionally, and Base UI's mouse path only emits on real transitions —
    // consumers count opens).
    if (!isOpen) {
      requestOpenChange(true)
    }
    // The provenance flag always arms, so a tap while the tip is open from a non-touch
    // source (hybrid hover, controlled open) still gets the tap-away dismissal.
    setIsTouchOpened(true)
  })
  // Any close (Escape, hover-out, controlled) retires the touch session. isTouchOpened
  // is provenance ("this open came from a tap"), not a second open flag, so it can't
  // merge into isOpen (which the root owns and a caller may control) — but the reset is
  // derived state, adjusted during render (React's set-state-while-rendering pattern)
  // rather than in an effect, so the dismissal listener below never outlives the open.
  if (isTouchOpened && !isOpen) {
    setIsTouchOpened(false)
  }
  useEffect(() => {
    if (!isTouchOpened) {
      return undefined
    }
    const handleDocumentPointerDown = (event: globalThis.PointerEvent): void => {
      const target = event.target
      if (target instanceof Element) {
        if (triggerNodeRef.current?.contains(target) === true) {
          return
        }
        // Taps inside interactive tooltip content (pointerEvents="auto" call sites)
        // must not dismiss it.
        if (target.closest(`[data-slot="${TOOLTIP_POPUP_DATA_SLOT}"]`) !== null) {
          return
        }
      }
      setIsTouchOpened(false)
      requestOpenChange(false)
    }
    // Capture phase, so content that stops propagation cannot wedge the tip open.
    document.addEventListener('pointerdown', handleDocumentPointerDown, true)
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  }, [isTouchOpened, requestOpenChange, triggerNodeRef])

  return { handleTouchPointerDown }
}
