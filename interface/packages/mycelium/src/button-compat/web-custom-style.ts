/**
 * The custom-`backgroundColor` inline style of the WEB leg, extracted from
 * `ButtonCompat.web.tsx` purely for the oxlint `max-lines` cap (the
 * `./web-text` precedent). A custom background paints the frame and, by
 * legacy contract, its border — plus the focus-outline custom property the
 * frame CSS reads.
 *
 * Hex/rgb only (the type says so): the value lands in an inline declaration,
 * where a `$token` would be invalid CSS silently dropped.
 */
import type { CSSProperties } from 'react'
import type { HexOrRgbColor } from '../button-frame-compat/custom-color'
import { MEDIA_VARIANT } from '../compat/media'
import type { MediaPropKey } from '../compat/props'
import type { ButtonCompatDimensionLaneProps } from './dimensions'

const MEDIA_PROP_KEYS = Object.keys(MEDIA_VARIANT) as MediaPropKey[]

/**
 * Whether an explicit `borderColor` owns the border — at the top level, in
 * `$platform-web`, or in any media pool. An explicit value paints through the
 * class lane, and the inline custom-bg border below would beat every class
 * (pooled twins included), so it is withheld.
 */
function ownsBorderColor(laneProps: ButtonCompatDimensionLaneProps): boolean {
  return (
    laneProps.borderColor !== undefined ||
    laneProps['$platform-web']?.borderColor !== undefined ||
    MEDIA_PROP_KEYS.some((key) => laneProps[key]?.borderColor !== undefined)
  )
}

export function getCustomStyle({
  backgroundColor,
  isDisabled,
  laneProps,
  primaryColor,
  style,
}: {
  backgroundColor: HexOrRgbColor | undefined
  isDisabled: boolean
  /** The dimension lane's full input — read only to see whether an explicit borderColor owns the border. */
  laneProps: ButtonCompatDimensionLaneProps
  primaryColor: string | undefined
  style: CSSProperties | undefined
}): CSSProperties | undefined {
  if (backgroundColor === undefined || isDisabled) {
    return style
  }
  return {
    backgroundColor,
    ...(ownsBorderColor(laneProps) ? undefined : { borderColor: backgroundColor }),
    '--sbtn-custom-outline': primaryColor ?? backgroundColor,
    ...style,
  } as CSSProperties
}
