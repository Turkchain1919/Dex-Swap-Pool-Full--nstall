/**
 * Platform-split base stub — bundlers resolve `useIsDarkMode.web` /
 * `useIsDarkMode.native`.
 */
import { PlatformSplitStubError } from 'utilities/src/errors'

export function useIsDarkMode(): boolean {
  throw new PlatformSplitStubError('useIsDarkMode')
}
