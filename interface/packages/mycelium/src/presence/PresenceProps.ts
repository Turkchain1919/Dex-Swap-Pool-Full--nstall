import type { CSSProperties, ReactNode } from 'react'

/**
 * Re-resolved presentation for exiting clones: merged over each clone's own
 * `className`/`style` on every render (never cumulatively — always over the
 * captured original), so a `custom` change mid-exit swaps the exit classes or
 * inline transform in place. `className` merges with tailwind-merge
 * semantics: a conflicting exit utility replaces the one it re-resolves.
 */
export interface PresenceExitProps {
  className?: string
  style?: CSSProperties
}

/**
 * Prop surface for the web `Presence` primitive — the CSS-lane replacement
 * for the legacy Tamagui `AnimatePresence` wrapper. Children are diffed by
 * key, so siblings need stable explicit keys; a single conditional child
 * (`{open && <X />}`) works without one.
 */
export interface PresenceProps<TCustom = unknown> {
  children?: ReactNode
  /**
   * `false` skips enter animations for children present on the first render:
   * their `animate-spore-enter-*` class tokens are stripped, and stay
   * stripped while the element is mounted (re-adding an animation class
   * would replay it). Children mounted later animate normally.
   */
  initial?: boolean
  /** Defer mounting new children until every exiting child has unmounted. */
  exitBeforeEnter?: boolean
  /** Fires each time the exiting set drains to empty. */
  onExitComplete?: () => void
  /**
   * Consumer channel threaded into {@link getExitProps}. Changing it while
   * children are exiting re-resolves their exit presentation in place — the
   * contract the pager-style direction swap depends on.
   */
  custom?: TCustom
  /** Resolves the exit presentation applied to every exiting clone, from the current `custom`. */
  getExitProps?: (custom: TCustom | undefined) => PresenceExitProps
  /**
   * The children bring their own native enter AND exit animation (Reanimated
   * `entering`/`exiting`), so the native leg adds no `Animated.View` wrapper:
   * no opacity seed, no fades, and removal is handed straight to Reanimated.
   * Inert on web, where the child's own `data-exiting` hold still runs — the
   * whole difference from `animatePresence={false}`, which drops the hold on
   * both platforms.
   */
  childOwnsNativeAnimation?: boolean
}
