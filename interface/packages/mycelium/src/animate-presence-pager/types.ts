import type { SporeAnimationCurveName } from '@universe/tailwind/animations'
import type { ReactNode } from 'react'

export type TransitionDirection = 'forward' | 'backward' | 'up' | 'down'

/** Direction vocabulary of the pager family — `usePortfolioTabsAnimation`-style hooks type against this. */
export type AnimationType = 'fade' | TransitionDirection

/** Legacy slide distance: `AnimatedItem`'s `going` variant defaulted `distance` to 10px. */
export const DEFAULT_PAGER_DISTANCE = 10

/**
 * Legacy default preset: `TransitionItem`/`AnimateTransition` animated with
 * `fastHeavy` unless a caller picked another curve.
 */
export const DEFAULT_PAGER_CURVE: SporeAnimationCurveName = 'fastHeavy'

interface PagerTransitionConfig {
  animationType?: AnimationType
  /** Slide distance in px. */
  distance?: number
  /** Skip the opacity half of the transition, sliding at full opacity. */
  disableFade?: boolean
  /**
   * Spore curve driving the transition. Replaces the legacy preset prop named
   * `animation` — that spelling is banned on added lines by the migration
   * gates (INFRA-2958), and the vocabulary is the same Spore curve set.
   */
  curve?: SporeAnimationCurveName
}

export interface TransitionItemProps extends PagerTransitionConfig {
  /** Key identifying the current page; changing it runs exit-then-enter. */
  childKey?: string | number
  children?: ReactNode
}

export interface AnimateTransitionProps extends PagerTransitionConfig {
  /** Index into `children` selecting the rendered page. */
  currentIndex: number
  children: ReactNode
}

export interface AnimatedPagerProps extends Omit<PagerTransitionConfig, 'animationType'> {
  /** Index into `children`; the slide direction follows how it changes. */
  currentIndex: number
  children: ReactNode
}

export interface PagerOffset {
  x: number
  y: number
}

/**
 * Enter/exit slide offsets per direction, transcribed from the legacy
 * `getAnimationOffsets`: a `forward` page enters from the right (`+x`) and
 * exits to the left (`-x`), etc.; `fade` moves nothing.
 */
export function getAnimationOffsets(
  animationType: AnimationType,
  distance: number,
): { enterOffset: PagerOffset; exitOffset: PagerOffset } {
  switch (animationType) {
    case 'forward':
      return { enterOffset: { x: distance, y: 0 }, exitOffset: { x: -distance, y: 0 } }
    case 'backward':
      return { enterOffset: { x: -distance, y: 0 }, exitOffset: { x: distance, y: 0 } }
    case 'up':
      return { enterOffset: { x: 0, y: distance }, exitOffset: { x: 0, y: -distance } }
    case 'down':
      return { enterOffset: { x: 0, y: -distance }, exitOffset: { x: 0, y: distance } }
    case 'fade':
      return { enterOffset: { x: 0, y: 0 }, exitOffset: { x: 0, y: 0 } }
    default: {
      // Defect guard: AnimationType is a closed union; a new member must pick
      // its offsets here explicitly.
      const unreachable: never = animationType
      throw new Error(`unknown pager animation type: ${String(unreachable)}`)
    }
  }
}
