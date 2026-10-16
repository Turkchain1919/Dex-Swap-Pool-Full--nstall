import { createContext, type MutableRefObject } from 'react'
import type { PopoverProps, PopoverVia } from 'ui/src/components/popover/types'

/**
 * Root → parts contexts for the rebuilt Popover legs (INFRA-3318). Platform-neutral
 * module: type-only DOM references, no react-native / react-dom / Base UI runtime
 * imports — each leg provides its own context value.
 */

export const popoverNoop = (): void => {}

/** The Base UI change-details slice the web leg consumes (structural — no Base UI import). */
export interface BaseUIChangeDetails {
  reason?: string
  event?: Event
  cancel?: () => void
}

/** The legacy Dismissable interceptor surface `Popover.Content` registers on the root. */
export interface PopoverDismissInterceptors {
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onPointerDownOutside?: (event: CustomEvent<{ originalEvent: PointerEvent }>) => void
  onFocusOutside?: (event: CustomEvent<{ originalEvent: FocusEvent }>) => void
  onInteractOutside?: (
    event: CustomEvent<{ originalEvent: PointerEvent }> | CustomEvent<{ originalEvent: FocusEvent }>,
  ) => void
}

export interface WebPopoverConfigContextValue {
  open: boolean
  setOpen: (open: boolean, via?: PopoverVia) => void
  placement?: PopoverProps['placement']
  offset?: PopoverProps['offset']
  stayInFrame?: PopoverProps['stayInFrame']
  allowFlip?: PopoverProps['allowFlip']
  strategy?: 'absolute' | 'fixed'
  openOnHover: boolean
  openDelayMs: number
  closeDelayMs: number
  /** Registered arrow size — the legacy `offset ?? arrowSize` fallback. */
  arrowSize: number
  onArrowSize: (size: number) => void
  /** Custom `Popover.Anchor` element; when set the trigger no longer anchors. */
  anchorElement: Element | null
  setAnchorElement: (element: Element | null) => void
  /** Trigger element, registered by `Popover.Trigger` — resolves the host portal container. */
  triggerElement: HTMLElement | null
  setTriggerElement: (element: HTMLElement | null) => void
  /** Virtual rect registered through the imperative `anchorTo`. */
  virtualRect: { x: number; y: number; width: number; height: number } | null
  /** Adapt-to-sheet displacement state. */
  adaptActive: boolean
  setAdaptActive: (active: boolean) => void
  adaptContainer: HTMLElement | null
  setAdaptContainer: (node: HTMLElement | null) => void
  /** Content-registered dismissal interceptors (legacy Dismissable surface). */
  dismissInterceptorsRef: MutableRefObject<PopoverDismissInterceptors | null>
}

export const WebPopoverConfigContext = createContext<WebPopoverConfigContextValue>({
  open: false,
  setOpen: popoverNoop,
  openOnHover: false,
  openDelayMs: 0,
  closeDelayMs: 0,
  arrowSize: 0,
  onArrowSize: popoverNoop,
  anchorElement: null,
  setAnchorElement: popoverNoop,
  triggerElement: null,
  setTriggerElement: popoverNoop,
  virtualRect: null,
  adaptActive: false,
  setAdaptActive: popoverNoop,
  adaptContainer: null,
  setAdaptContainer: popoverNoop,
  dismissInterceptorsRef: { current: null },
})

export interface NativePopoverConfigContextValue {
  open: boolean
  setOpen: (open: boolean, via?: PopoverVia) => void
  placement?: PopoverProps['placement']
  offset?: PopoverProps['offset']
  stayInFrame?: PopoverProps['stayInFrame']
  allowFlip?: PopoverProps['allowFlip']
  arrowSize: number
  onArrowSize: (size: number) => void
  hasCustomAnchor: boolean
  onCustomAnchorChange: (present: boolean) => void
}

export const NativePopoverConfigContext = createContext<NativePopoverConfigContextValue>({
  open: false,
  setOpen: popoverNoop,
  arrowSize: 0,
  onArrowSize: popoverNoop,
  hasCustomAnchor: false,
  onCustomAnchorChange: popoverNoop,
})

/**
 * True inside the native ContentFrame's children slot. `Popover.Content` hoists
 * only DIRECT-child `Popover.Arrow` elements onto the positioned wrapper — an
 * arrow nested in a fragment or wrapper component falls back into the
 * padded/bordered frame, where Yoga displaces its absolute insets by
 * border+padding (the INFRA-3318 device-diff arrow regression). PopoverArrow
 * reads this to warn in dev when it mounts un-hoisted.
 */
export const PopoverFrameSlotContext = createContext<boolean>(false)
