import type { PresenceExitProps } from '@universe/mycelium/presence'
import type { CSSProperties } from 'react'

/**
 * Enter/exit lane for the ActionSheetDropdown overlay nodes, on the parameterized spore presence
 * keyframes. The enter keyframe declares only a `from` frame and the exit only a `to`, so both
 * resolve against the element's own computed style — the geometry the legacy `enterStyle`/
 * `exitStyle` pair produced. Duration and easing are pinned inline to the legacy curves; the
 * presets are 200ms ease-out, which is not what these sites had.
 */
export const PRESENCE_CLASSES = 'animate-spore-enter-presence data-exiting:animate-spore-exit-presence'

/** Legacy `fast` preset — 100ms on the Spore bezier — plus the y-offset enter/exit geometry. */
export const CONTENT_PRESENCE_STYLE = {
  animationDuration: '100ms',
  animationTimingFunction: 'cubic-bezier(0.17, 0.67, 0.45, 1)',
  '--spore-presence-enter-y': '-20px',
  '--spore-presence-enter-opacity': '0',
  '--spore-presence-exit-y': '-10px',
  '--spore-presence-exit-opacity': '0',
} as CSSProperties

/** Legacy `100ms` preset — ease-in-out, opacity only. */
export const BACKDROP_PRESENCE_STYLE = {
  animationDuration: '100ms',
  animationTimingFunction: 'ease-in-out',
  '--spore-presence-enter-opacity': '0',
  '--spore-presence-exit-opacity': '0',
} as CSSProperties

/**
 * Replaces the legacy `AnimatePresence custom={{ isOpen }}` variant injection: Tamagui pushed
 * `isOpen: false` into the exiting clones so touches passed through while the dropdown animated
 * closed. Exit always means closed, so the exiting clones take the class unconditionally.
 */
export const dropdownExitProps: (() => PresenceExitProps) | undefined = () => ({
  className: 'pointer-events-none',
})

/** Web holds both overlay nodes through their fade; the exit class keeps them non-interactive. */
export const OVERLAY_ANIMATE_PRESENCE: boolean | undefined = undefined
