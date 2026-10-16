import type { JSX } from 'react'
import type { AnimatedPagerProps, AnimateTransitionProps, TransitionItemProps } from './types'

/**
 * Platformless base stubs for the pager family — bundlers resolve the real
 * implementations (`AnimatePresencePager.web.tsx` /
 * `AnimatePresencePager.native.tsx`) via their platform extension order.
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (defect in bundler configuration, not an expected failure).
 */
export function TransitionItem(_props: TransitionItemProps): JSX.Element {
  throw new Error('TransitionItem not implemented. Did you forget a platform override?')
}

export function AnimateTransition(_props: AnimateTransitionProps): JSX.Element {
  throw new Error('AnimateTransition not implemented. Did you forget a platform override?')
}

export function AnimatedPager(_props: AnimatedPagerProps): JSX.Element {
  throw new Error('AnimatedPager not implemented. Did you forget a platform override?')
}
