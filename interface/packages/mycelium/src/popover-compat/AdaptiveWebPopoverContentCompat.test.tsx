/**
 * Focus behavior of the compat popover nested inside a Radix modal Dialog
 * (the AdaptiveWebModal shape): the dialog's trap yanks focus off a
 * body-portaled popup, so its inputs read as dead (SWAP-3309).
 */
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdaptiveWebPopoverContentCompat } from './AdaptiveWebPopoverContentCompat'
import { PopoverCompat } from './PopoverCompat'
import { OVERLAY_PORTAL_CONTAINER_ATTRIBUTE } from './portal-container'

// Base UI's Positioner runs floating-ui autoUpdate, which observes resizes.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
)

// The sheet-adapt gate reads useMedia; jsdom has no matchMedia. Every query
// mismatches, so the popover leg renders (mirrors packages/tailwind/vitest-setup.ts).
vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
)

function preventEvent(event: Event): void {
  event.preventDefault()
}

// Minimal AdaptiveWebModal shape. `markContainer` mirrors the real modal's
// portal-target attribute; without it the popup portals to document.body and
// relies on the FocusScope-pause fallback.
function DialogWithNetworkSearchPopover({ markContainer = false }: { markContainer?: boolean }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const containerMarker = markContainer ? { [OVERLAY_PORTAL_CONTAINER_ATTRIBUTE]: '' } : undefined

  return (
    <>
      <DialogPrimitive.Root modal open>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            aria-describedby={undefined}
            data-testid="dialog-content"
            onFocusOutside={preventEvent}
            onPointerDownOutside={preventEvent}
            {...containerMarker}
          >
            <DialogPrimitive.Title>Select a token</DialogPrimitive.Title>
            <PopoverCompat open={isOpen} placement="bottom-end" onOpenChange={setIsOpen}>
              <PopoverCompat.Trigger>
                <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen(true)}>
                  Open networks
                </button>
              </PopoverCompat.Trigger>
              <AdaptiveWebPopoverContentCompat isOpen={isOpen} placement="bottom-end">
                <input aria-label="Search networks" />
                <button type="button" aria-label="Select network" onClick={() => setIsOpen(false)}>
                  Select network
                </button>
              </AdaptiveWebPopoverContentCompat>
            </PopoverCompat>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <input aria-label="outside probe" />
    </>
  )
}

// UNCONTROLLED root (no `open` prop): Base UI owns the open state, so opening
// re-renders nothing above the popup — the content wrapper must already know
// the trigger's element to resolve the marked host on the FIRST open.
function MarkedDialogWithUncontrolledPopover({ defaultOpen = false }: { defaultOpen?: boolean }): JSX.Element {
  return (
    <DialogPrimitive.Root modal open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          data-testid="dialog-content"
          onFocusOutside={preventEvent}
          onPointerDownOutside={preventEvent}
          {...{ [OVERLAY_PORTAL_CONTAINER_ATTRIBUTE]: '' }}
        >
          <DialogPrimitive.Title>Select a token</DialogPrimitive.Title>
          <PopoverCompat defaultOpen={defaultOpen} placement="bottom-end">
            <PopoverCompat.Trigger>
              <button type="button">Open networks</button>
            </PopoverCompat.Trigger>
            <AdaptiveWebPopoverContentCompat isOpen placement="bottom-end">
              <input aria-label="Search networks" />
            </AdaptiveWebPopoverContentCompat>
          </PopoverCompat>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// jsdom dispatches focusin during focus(), which the trap listens for. Seed
// the trap's last-focused element, then confirm it pulls an outside focus
// back, so the popup assertions can't pass vacuously.
function proveDialogTrapEngaged(trigger: HTMLElement, probe: HTMLElement): void {
  trigger.focus()
  probe.focus()
  expect(document.activeElement).toBe(trigger)
}

// Sheet-adapted shape (mobile web): the Base UI popup never mounts — the
// content renders through WebBottomSheet instead. The Base UI root's own
// dismissal then reads every press as an outside press (its popup element is
// null), which closed the sheet on any tap inside it (SWAP-3309, mobile web).
function SheetAdaptedNetworkPopover(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <PopoverCompat open={isOpen} placement="bottom-end" onOpenChange={setIsOpen}>
      <PopoverCompat.Trigger>
        <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen(true)}>
          Open networks
        </button>
      </PopoverCompat.Trigger>
      <AdaptiveWebPopoverContentCompat
        isSheet
        isOpen={isOpen}
        webBottomSheetProps={{ onClose: () => setIsOpen(false) }}
      >
        <input aria-label="Search networks" />
        <button type="button" aria-label="Select network" onClick={() => setIsOpen(false)}>
          Select network
        </button>
      </AdaptiveWebPopoverContentCompat>
    </PopoverCompat>
  )
}

afterEach(cleanup)

describe('AdaptiveWebPopoverContentCompat', () => {
  // SWAP-3309 primary mechanism: containment holds no matter how the bundler
  // chunks the focus-scope module.
  it('portals the popup inside a host-marked container and keeps input focus there', async () => {
    render(<DialogWithNetworkSearchPopover markContainer />)
    const trigger = await screen.findByText<HTMLButtonElement>('Open networks')
    proveDialogTrapEngaged(trigger, screen.getByLabelText('outside probe'))

    fireEvent.click(trigger)
    const input = await screen.findByLabelText('Search networks')

    expect(screen.getByTestId('dialog-content').contains(input)).toBe(true)

    input.focus()
    expect(document.activeElement).toBe(input)
  })

  // SWAP-3309 regression guard: an UNCONTROLLED open re-renders nothing above
  // the popup, so the host must resolve from the trigger element as context
  // state — a mount-time snapshot would portal the first open to document.body
  // and re-race the dialog's focus trap.
  it('portals an uncontrolled defaultOpen popup inside the host-marked container on first open', async () => {
    render(<MarkedDialogWithUncontrolledPopover defaultOpen />)
    const input = await screen.findByLabelText('Search networks')

    expect(input.closest(`[${OVERLAY_PORTAL_CONTAINER_ATTRIBUTE}]`)).toBe(screen.getByTestId('dialog-content'))
    expect(screen.getByTestId('dialog-content').contains(input)).toBe(true)
  })

  it('portals an uncontrolled trigger-opened popup inside the host-marked container on first open', async () => {
    render(<MarkedDialogWithUncontrolledPopover />)
    fireEvent.click(await screen.findByText('Open networks'))
    const input = await screen.findByLabelText('Search networks')

    expect(input.closest(`[${OVERLAY_PORTAL_CONTAINER_ATTRIBUTE}]`)).toBe(screen.getByTestId('dialog-content'))
    expect(screen.getByTestId('dialog-content').contains(input)).toBe(true)
  })

  // SWAP-3309 fallback: an unmarked host gets the FocusScope-pause path.
  it('keeps focus on an input inside the portaled popup while hosted in a modal Radix Dialog', async () => {
    render(<DialogWithNetworkSearchPopover />)
    const trigger = await screen.findByText<HTMLButtonElement>('Open networks')
    proveDialogTrapEngaged(trigger, screen.getByLabelText('outside probe'))

    fireEvent.click(trigger)
    const input = await screen.findByLabelText('Search networks')

    input.focus()
    expect(document.activeElement).toBe(input)
  })

  it('resumes the dialog trap once the popup closes', async () => {
    render(<DialogWithNetworkSearchPopover />)
    const trigger = await screen.findByText<HTMLButtonElement>('Open networks')
    const probe = screen.getByLabelText('outside probe')
    proveDialogTrapEngaged(trigger, probe)

    fireEvent.click(trigger)
    const input = await screen.findByLabelText('Search networks')
    input.focus()
    expect(document.activeElement).toBe(input)

    fireEvent.click(screen.getByLabelText('Select network'))
    await waitFor(() => {
      expect(screen.queryByLabelText('Search networks')).toBeNull()
    })

    // The pause-scope unregisters on a 0ms timeout; the trap must re-engage after.
    await waitFor(() => {
      proveDialogTrapEngaged(trigger, probe)
    })
  })

  // SWAP-3309 mobile web: with the popup displaced by the sheet, the root's
  // outside-press dismissal must be swallowed — a press inside the sheet
  // (search input, network rows) is not an outside press.
  it('stays open when pressing inside the sheet-adapted content', async () => {
    render(<SheetAdaptedNetworkPopover />)
    fireEvent.click(await screen.findByText('Open networks'))
    const input = await screen.findByLabelText('Search networks')

    fireEvent.pointerDown(input)
    fireEvent.mouseDown(input)
    fireEvent.click(input)
    input.focus()

    await waitFor(() => {
      expect(screen.getByText('Open networks').getAttribute('aria-expanded')).toBe('true')
    })
  })

  it('still closes the sheet-adapted content through the consumer close path', async () => {
    render(<SheetAdaptedNetworkPopover />)
    const trigger = await screen.findByText('Open networks')
    fireEvent.click(trigger)
    await screen.findByLabelText('Search networks')

    fireEvent.click(screen.getByLabelText('Select network'))
    await waitFor(() => {
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })
  })
})
