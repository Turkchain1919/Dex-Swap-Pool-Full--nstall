/**
 * Platform-split base stub — bundlers resolve `useIsTouchDevice.web` /
 * `useIsTouchDevice.native` (the `ui/src` convention).
 */
import { PlatformSplitStubError } from '@universe/environment'

export function useIsTouchDevice(): boolean {
  throw new PlatformSplitStubError('useIsTouchDevice')
}
