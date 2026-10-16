/**
 * The `IconButtonFrame` styled()-extension size variant from the legacy
 * `IconButton.tsx` — an icon button is square, so each size collapses the
 * frame's directional padding to one uniform token and keeps the size's
 * radius — expressed as OPEN-LANE style-prop defaults rather than literal
 * classes: variant styling must LOSE to a caller's own padding/radius props
 * (Tamagui `variants < props`), and the frame's open emission is where that
 * precedence already lives. The tokens' emitted twins (`p-[6px]`…,
 * `rounded-[12px]`…) are in the closed compat class set on BOTH platforms and
 * are px-identical to the `ICON_BUTTON_SIZE_CLASSES` literal table in
 * `../button-frame-compat/compile` (pinned by ./IconButtonCompat.test.tsx).
 */
import type { ButtonSize } from '../button-frame-compat/compile'
import type { RadiusValue, SpaceValue } from '../compat/props'

/** Legacy size variant `p`: $spacing6/8/8/12/16. */
export const ICON_BUTTON_FRAME_PADDING: Record<ButtonSize, SpaceValue> = {
  xxsmall: '$spacing6',
  xsmall: '$spacing8',
  small: '$spacing8',
  medium: '$spacing12',
  large: '$spacing16',
}

/** Legacy size variant `borderRadius`: $rounded12/12/12/16/20. */
export const ICON_BUTTON_FRAME_RADIUS: Record<ButtonSize, RadiusValue> = {
  xxsmall: '$rounded12',
  xsmall: '$rounded12',
  small: '$rounded12',
  medium: '$rounded16',
  large: '$rounded20',
}

/**
 * The size variant as defaults the caller's own props replace. `p` also
 * yields to the `padding` LONGHAND: the emission engine resolves a p/padding
 * collision by fixed order (`p` wins), which would invert legacy's
 * props-beat-variants precedence if the default stayed in the bag.
 */
export function iconButtonSizeDefaultProps({
  size,
  p,
  padding,
  borderRadius,
}: {
  size: ButtonSize
  p?: SpaceValue
  padding?: SpaceValue
  borderRadius?: RadiusValue
}): { p?: SpaceValue; borderRadius?: RadiusValue } {
  return {
    ...(p === undefined && padding === undefined ? { p: ICON_BUTTON_FRAME_PADDING[size] } : undefined),
    ...(borderRadius === undefined ? { borderRadius: ICON_BUTTON_FRAME_RADIUS[size] } : undefined),
  }
}
