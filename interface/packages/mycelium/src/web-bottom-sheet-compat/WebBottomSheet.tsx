/**
 * Platform-split base stub — bundlers resolve `WebBottomSheet.web` /
 * `WebBottomSheet.native` (the `ui/src` convention).
 */
import { PlatformSplitStubError } from '@universe/environment'
import type * as React from 'react'
import type { WebBottomSheetProps } from './props'

export function WebBottomSheet(_props: WebBottomSheetProps): React.JSX.Element | null {
  throw new PlatformSplitStubError('WebBottomSheet')
}
