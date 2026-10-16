import { useRef } from 'react'
import type { TransitionDirection } from './types'

/**
 * Derives the slide direction from how `currentIndex` moves: starts
 * `forward`, follows each index change, and keeps the last direction while
 * the index holds still. Derived during render (a ref pair, updated
 * idempotently) rather than in an effect like the legacy `AnimatedPager` —
 * the commit that moves the index then already renders the fresh direction,
 * so the exit arms with the right offsets instead of relying on the mid-exit
 * re-point one commit later.
 */
export function usePagerDirection(currentIndex: number): TransitionDirection {
  const prevIndexRef = useRef(currentIndex)
  const directionRef = useRef<TransitionDirection>('forward')
  // Idempotent under replayed renders: the first invoke updates both refs;
  // a replay of the same inputs sees an unchanged index and keeps the
  // direction it already derived.
  if (currentIndex > prevIndexRef.current) {
    directionRef.current = 'forward'
  } else if (currentIndex < prevIndexRef.current) {
    directionRef.current = 'backward'
  }
  prevIndexRef.current = currentIndex
  return directionRef.current
}
