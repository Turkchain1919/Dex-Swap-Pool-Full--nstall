import { MobileDeviceHeight } from './device-height'

/**
 * Web leg of `useIsShortMobileDevice`: always false, exactly like the legacy
 * `ui/src/hooks/useIsShortMobileDevice.web.ts` — the hook answers "is this the
 * mobile app on a short device", which web never is.
 */
export const useIsShortMobileDevice = (_deviceHeight: MobileDeviceHeight = MobileDeviceHeight.iPhone12): boolean => {
  return false
}
