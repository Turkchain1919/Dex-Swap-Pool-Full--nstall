/**
 * Platform-split base stub — bundlers resolve `useIsShortMobileDevice.web` /
 * `useIsShortMobileDevice.native` (the `ui/src` convention).
 */
import { PlatformSplitStubError } from '@universe/environment'
import { MobileDeviceHeight } from './device-height'

/**
 * @param deviceHeight - The device height to compare against. @default MobileDeviceHeight.iPhone12 (812)
 * @returns true when running in the mobile app on a device whose height (minus
 * the bottom inset) is at or below the given device's height minus the default
 * bottom inset — always false on web, like the legacy hook.
 */
export const useIsShortMobileDevice = (_deviceHeight: MobileDeviceHeight = MobileDeviceHeight.iPhone12): boolean => {
  throw new PlatformSplitStubError('useIsShortMobileDevice')
}
