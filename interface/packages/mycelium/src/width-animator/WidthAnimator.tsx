import type { JSX } from 'react'
import type { WidthAnimatorProps } from './WidthAnimatorProps'

/**
 * Platformless base stub for the `WidthAnimator` primitive — bundlers resolve
 * the real implementation (`WidthAnimator.web.tsx` /
 * `WidthAnimator.native.tsx`) via their platform extension order.
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (defect in bundler configuration, not an expected failure).
 */
export function WidthAnimator(_props: WidthAnimatorProps): JSX.Element {
  throw new Error('WidthAnimator not implemented. Did you forget a platform override?')
}
