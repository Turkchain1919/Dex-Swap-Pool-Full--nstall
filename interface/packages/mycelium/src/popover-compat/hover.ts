/**
 * The hover-open slice of the legacy popover root (`hoverable`).
 * Mirrored from `mapHoverableToDelays` in `ui/src/components/popover/shared.ts`
 * — mycelium cannot import ui/src (dependency cycle), so the popover parity
 * suite pins the two mappers against each other on the same input matrix.
 * Pure data + types only: the native index re-exports this file for real.
 */

/**
 * The `useHover` slice of the legacy `hoverable` prop repo call sites drive
 * (`delay`/`restMs`/`move`); other floating-ui knobs are accepted-inert.
 */
export type PopoverCompatHoverableProps =
  | boolean
  | {
      delay?: number | { open?: number; close?: number }
      restMs?: number
      move?: boolean
      [key: string]: unknown
    }

export interface PopoverCompatHoverDelays {
  openOnHover: boolean
  openDelayMs: number
  closeDelayMs: number
}

/**
 * Map the legacy `hoverable` prop onto hover-open timing. Legacy semantics
 * (floating-ui `useHover`): open after the pointer rests `restMs` when
 * `delay.open` is 0, else after `delay.open`; close after `delay.close`.
 * The Base UI trigger has one fixed open delay (its `delay` prop is a rest
 * delay), so `restMs` stands in for a zero open delay — the same ledgered
 * approximation as the rebuilt ui/src web leg and the Tooltip rebuild.
 */
export function mapHoverableToDelays(hoverable: PopoverCompatHoverableProps | undefined): PopoverCompatHoverDelays {
  if (hoverable === undefined || hoverable === false) {
    return { openOnHover: false, openDelayMs: 0, closeDelayMs: 0 }
  }
  if (hoverable === true) {
    return { openOnHover: true, openDelayMs: 0, closeDelayMs: 0 }
  }
  const delay = hoverable.delay
  const openDelay = typeof delay === 'number' ? delay : (delay?.open ?? 0)
  const closeDelay = typeof delay === 'number' ? delay : (delay?.close ?? 0)
  const restMs = hoverable.restMs ?? 0
  return {
    openOnHover: true,
    openDelayMs: openDelay > 0 ? openDelay : restMs,
    closeDelayMs: closeDelay,
  }
}
