import { PlatformSplitStubError } from '@universe/environment'
import type * as React from 'react'
import type { SegmentedControlProps } from './types'

/**
 * Platformless base stub of the SegmentedControl platform split — bundlers
 * resolve the real implementation (`SegmentedControl.web.tsx` /
 * `SegmentedControl.native.tsx`) via their platform extension order.
 *
 * @throws always — reaching this module means the platform override did not
 * resolve (defect in bundler configuration, not an expected failure).
 */
export function SegmentedControl<T extends string = string>(_props: SegmentedControlProps<T>): React.JSX.Element {
  throw new PlatformSplitStubError('SegmentedControl')
}
