/**
 * Native leg of the `AnimatableCopyIcon` compat (INFRA-3653): the legacy
 * static branch only — a relative box holding the CopySheets glyph drawn with
 * `react-native-svg` (the `modal-close-icon` mechanism; mycelium icon
 * components emit a DOM `<svg>` and have no native leg by design, the
 * ratified INFRA-3227 lane).
 *
 * Legacy behavior on device, mirrored deliberately: `isAnimated` defaults to
 * legacy's `isWebApp`, compile-time `false` on this platform split —
 * mobile/extension show a "copied" popup instead of the crossfade.
 */
import type { JSX } from 'react'
import { Path, Svg } from 'react-native-svg'
import { FlexCompat } from '../flex-compat/FlexCompat'
import { useSporeColors } from '../theme-hooks-compat'
import { DEFAULT_COPY_ICON_COLOR, type CopyIconProps } from './props'
import { COPY_SHEETS_GLYPH, resolveCopyIconColor } from './resolve'

// Always static on this leg: the copy → checkmark crossfade is web-only, so `isAnimated` is ignored here — show a "copied" toast/popup on device, like legacy.
export function AnimatableCopyIconCompat({
  size,
  textColor = DEFAULT_COPY_ICON_COLOR,
  hideIcon,
  dataTestId,
}: CopyIconProps): JSX.Element {
  const colors = useSporeColors()

  return (
    <FlexCompat position="relative" width={size} height={size}>
      {!hideIcon && (
        <Svg fill="none" height={size} testID={dataTestId} viewBox={COPY_SHEETS_GLYPH.viewBox} width={size}>
          <Path d={COPY_SHEETS_GLYPH.path} fill={resolveCopyIconColor(textColor, colors)} />
        </Svg>
      )}
    </FlexCompat>
  )
}
