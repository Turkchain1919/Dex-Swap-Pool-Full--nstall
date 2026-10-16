import type { JSX } from 'react'
import type { HeightAnimatorProps } from './HeightAnimatorProps'

/**
 * Platformless base stub for the `HeightAnimator` primitive — bundlers resolve
 * the real implementation (`HeightAnimator.web.tsx` /
 * `HeightAnimator.native.tsx`) via their platform extension order.
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (defect in bundler configuration, not an expected failure).
 */
export function HeightAnimator(_props: HeightAnimatorProps): JSX.Element {
  throw new Error('HeightAnimator not implemented. Did you forget a platform override?')
}
