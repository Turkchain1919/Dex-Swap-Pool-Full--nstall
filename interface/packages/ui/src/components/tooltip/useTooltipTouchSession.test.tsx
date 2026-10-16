/**
 * Focused tests for the trigger's touch-session state machine, apart from the Base UI
 * render branches (the integrated behavior stays pinned in Tooltip.parity.web.test.tsx).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { TOOLTIP_POPUP_DATA_SLOT } from 'ui/src/components/tooltip/shared'
import { useTooltipTouchSession } from 'ui/src/components/tooltip/useTooltipTouchSession'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(cleanup)

/**
 * jsdom 20 has no PointerEvent, so testing-library's fireEvent falls back to the bare
 * Event constructor, which silently DROPS `pointerType` — attach it explicitly so the
 * hook's mouse/non-mouse guard sees the real device kind.
 */
function fireTouchPointerDown(target: Element, pointerType: 'mouse' | 'touch' = 'touch'): void {
  const event = new Event('pointerdown', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  fireEvent(target, event)
}

/**
 * Semi-controlled like the real root: open requests from the hook drive local state
 * (recorded through the spy), while `externallyClosed` models a close the hook does
 * not own (Escape, hover-out, a controlling caller).
 */
function Harness({
  onRequestOpenChange,
  externallyClosed = false,
  externallyOpened = false,
  withPopup = false,
}: {
  onRequestOpenChange: (nextOpen: boolean) => void
  externallyClosed?: boolean
  /** Models an open the hook did not request (hybrid hover, controlled open). */
  externallyOpened?: boolean
  withPopup?: boolean
}): JSX.Element {
  const triggerNodeRef = useRef<HTMLDivElement | null>(null)
  const [requestedOpen, setRequestedOpen] = useState(false)
  const isOpen = (requestedOpen || externallyOpened) && !externallyClosed
  const { handleTouchPointerDown } = useTooltipTouchSession({
    isOpen,
    requestOpenChange: (nextOpen: boolean) => {
      onRequestOpenChange(nextOpen)
      setRequestedOpen(nextOpen)
    },
    triggerNodeRef,
  })
  return (
    <div>
      <div data-testid="trigger" ref={triggerNodeRef} onPointerDown={handleTouchPointerDown}>
        <span data-testid="trigger-child">trigger</span>
      </div>
      {withPopup && isOpen ? (
        <div data-slot={TOOLTIP_POPUP_DATA_SLOT}>
          <span data-testid="popup-content">tip</span>
        </div>
      ) : null}
      <div data-testid="outside">outside</div>
    </div>
  )
}

describe('useTooltipTouchSession', () => {
  it('a touch pointerdown requests open; a mouse pointerdown does not (mouse rides Base UI hover)', () => {
    const spy = vi.fn()
    render(<Harness onRequestOpenChange={spy} />)
    fireTouchPointerDown(screen.getByTestId('trigger'), 'mouse')
    expect(spy).not.toHaveBeenCalled()
    fireTouchPointerDown(screen.getByTestId('trigger'))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(true)
  })

  it('a repeat tap while already open re-emits nothing (the !isOpen gate)', () => {
    const spy = vi.fn()
    render(<Harness onRequestOpenChange={spy} />)
    const trigger = screen.getByTestId('trigger')
    fireTouchPointerDown(trigger)
    fireTouchPointerDown(trigger)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(true)
  })

  it('a tap while open from a non-touch source emits nothing but still arms tap-away', () => {
    const spy = vi.fn()
    render(<Harness externallyOpened onRequestOpenChange={spy} />)
    fireTouchPointerDown(screen.getByTestId('trigger'))
    // Already open — no duplicate onOpenChange(true)...
    expect(spy).not.toHaveBeenCalled()
    // ...but the tap took over provenance, so tap-away still dismisses.
    fireTouchPointerDown(screen.getByTestId('outside'))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(false)
  })

  it('an outside pointerdown after a touch open requests close (tap-away lifecycle)', () => {
    const spy = vi.fn()
    render(<Harness onRequestOpenChange={spy} />)
    fireTouchPointerDown(screen.getByTestId('trigger'))
    fireTouchPointerDown(screen.getByTestId('outside'))
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith(false)
  })

  it('a pointerdown inside the trigger subtree does not dismiss the session', () => {
    const spy = vi.fn()
    render(<Harness onRequestOpenChange={spy} />)
    fireTouchPointerDown(screen.getByTestId('trigger'))
    fireTouchPointerDown(screen.getByTestId('trigger-child'))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(true)
  })

  it('a pointerdown inside a tooltip popup does not dismiss the session', () => {
    const spy = vi.fn()
    render(<Harness withPopup onRequestOpenChange={spy} />)
    fireTouchPointerDown(screen.getByTestId('trigger'))
    fireTouchPointerDown(screen.getByTestId('popup-content'))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(true)
  })

  it('an external close retires the session — a later outside pointerdown requests nothing', () => {
    const spy = vi.fn()
    const view = render(<Harness onRequestOpenChange={spy} />)
    fireTouchPointerDown(screen.getByTestId('trigger'))
    expect(spy).toHaveBeenCalledTimes(1)
    // Close the tooltip out from under the hook (Escape / hover-out / controlled).
    view.rerender(<Harness externallyClosed onRequestOpenChange={spy} />)
    fireTouchPointerDown(screen.getByTestId('outside'))
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
