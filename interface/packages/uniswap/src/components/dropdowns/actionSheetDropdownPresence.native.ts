import type { PresenceExitProps } from '@universe/mycelium/presence'
import type { CSSProperties } from 'react'

/**
 * Native `Presence` owns an opacity fade on a fixed Spore 200ms clock and cannot read exit
 * presentation from a className, so the CSS lane is empty here. Shipping the web classes anyway
 * would risk uniwind compiling a second animation on top of that fade.
 *
 * Consequence, deliberate: the dropdown fades rather than sliding on device, and runs 200ms where
 * the legacy `fast`/`100ms` presets ran 100ms.
 */
export const PRESENCE_CLASSES = ''

export const CONTENT_PRESENCE_STYLE = {} as CSSProperties

export const BACKDROP_PRESENCE_STYLE = {} as CSSProperties

/** `getExitProps` re-resolves CSS exit presentation, which is inert here — and dev-warns if passed. */
export const dropdownExitProps: (() => PresenceExitProps) | undefined = undefined

/**
 * Native `Presence` cannot re-resolve exit presentation, so an exiting node keeps
 * `pointer-events-auto` for the whole fade: the backdrop would swallow taps and the content would
 * stay selectable. `false` unmounts both at once, restoring the legacy `custom`-injected
 * `pointerEvents: 'none'` semantics — at the cost of their fade-out.
 */
export const OVERLAY_ANIMATE_PRESENCE: boolean | undefined = false
