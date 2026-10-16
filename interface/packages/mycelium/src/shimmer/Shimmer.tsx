import type { JSX } from 'react'
import type { ShimmerProps } from './ShimmerProps'

/**
 * Platformless base stub for the `Shimmer` primitive — bundlers resolve the
 * real implementation (`Shimmer.web.tsx` / `Shimmer.native.tsx`) via their
 * platform extension order.
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (defect in bundler configuration, not an expected failure).
 */
export function Shimmer(_props: ShimmerProps): JSX.Element {
  throw new Error('Shimmer not implemented. Did you forget a platform override?')
}
