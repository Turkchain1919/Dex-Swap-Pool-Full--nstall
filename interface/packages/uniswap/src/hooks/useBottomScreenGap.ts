import { isAndroid, isIOS } from '@universe/environment'
import { spacing, useIsShortMobileDevice } from '@universe/mycelium'
import { useMemo } from 'react'
import { useAppInsets } from 'uniswap/src/hooks/useAppInsets'

export interface BottomScreenGap {
  /** Full gap between bottom-anchored content and the bottom edge of the screen (safe-area inset included). */
  bottomScreenTotalGap: number
  /** Portion of the gap above the safe area, for content whose parent (`Screen` bottom edge or `Modal`) already applies `insets.bottom`. */
  bottomScreenExtraGap: number
}

/**
 * Standard spacing between bottom-anchored content (CTAs, sheet footers) and the bottom edge of the screen:
 * safe-area bottom inset + spacing16, tightened on short iOS devices and widened by spacing8 on every Android
 * device. Measured insets: iOS home indicator 34, Android gesture nav ~24, Android three-button nav 48; the
 * Android bar is opaque system chrome, so it gets extra clearance even though it is not always smaller. The
 * widening also applies when `insets.bottom` is the DEFAULT_BOTTOM_INSET floor (OS reported 0), since the
 * floor is a design constant and cannot tell navigation modes apart.
 */
export function useBottomScreenGap(): BottomScreenGap {
  const insets = useAppInsets()
  const isShortMobileDevice = useIsShortMobileDevice()

  return useMemo(() => {
    const androidNavBarGap = isAndroid ? spacing.spacing8 : spacing.none
    const bottomScreenExtraGap =
      (isShortMobileDevice && isIOS ? spacing.spacing4 : spacing.spacing16) + androidNavBarGap

    return { bottomScreenTotalGap: insets.bottom + bottomScreenExtraGap, bottomScreenExtraGap }
  }, [insets.bottom, isShortMobileDevice])
}
