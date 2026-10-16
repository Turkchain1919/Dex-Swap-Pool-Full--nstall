// oxlint-disable-next-line no-restricted-imports -- ports the legacy useDeviceInsets bottom-inset backfill; mycelium has no useAppInsets
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context'
import { DEFAULT_BOTTOM_INSET, MobileDeviceHeight } from './device-height'

/**
 * Native leg of `useIsShortMobileDevice`, the direct port of
 * `ui/src/hooks/useIsShortMobileDevice.native.ts`: compares the safe-area
 * frame height (minus the bottom inset) against the reference device height
 * minus the legacy default bottom inset.
 *
 * The bottom inset mirrors the legacy `useDeviceInsets`: devices without an
 * on-screen navigation bar report 0, which legacy backfilled with
 * `DEFAULT_BOTTOM_INSET`.
 */
export const useIsShortMobileDevice = (deviceHeight: MobileDeviceHeight = MobileDeviceHeight.iPhone12): boolean => {
  const { height } = useSafeAreaFrame()
  const insets = useSafeAreaInsets()
  const bottomInset = insets.bottom === 0 ? DEFAULT_BOTTOM_INSET : insets.bottom

  const heightWithoutBottomInsets = deviceHeight - DEFAULT_BOTTOM_INSET

  return height - bottomInset <= heightWithoutBottomInsets
}
