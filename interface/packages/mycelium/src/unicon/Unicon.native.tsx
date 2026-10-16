/**
 * Native leg of `Unicon` (INFRA-3516): the same deterministic avatar as the
 * web leg, drawn with react-native-svg instead of a raw `<svg>`. Identity and
 * layout are shared with the web leg through `deriveUnicon`/`uniconGeometry`
 * (legacy-parity keccak hash for wallet addresses, cyrb53 backup for every
 * other input — see derive.ts), so the same input renders the same avatar on
 * every platform.
 *
 * Colors resolve through uniwind's variable store (the Shimmer.native
 * precedent): `--unicon-N` and `--unicon-bg-opacity` live in
 * @universe/tailwind/native.css's theme buckets, so light/dark switching
 * follows `Uniwind.setTheme()` exactly as the web leg follows its CSS
 * variables. A token that doesn't resolve to a simple hex falls back to the
 * static light palette in `colors.ts` (dev-warned, like Shimmer's glare
 * fallback).
 *
 * The custom `icon` slot renders as a centered absolute overlay — the web
 * leg's `<foreignObject>` has no react-native-svg equivalent. Native cannot
 * inherit the computed color into arbitrary children either (no CSS `color`
 * inheritance), so custom icons render with their own colors here.
 */
import { type ReactElement, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Circle, G, Path, Svg } from 'react-native-svg'
import { useThemeVariable } from '../theme/useThemeVariable.native'
import { deriveUnicon, resolveUniconInput, uniconGeometry } from './derive'
import {
  FALLBACK_UNICON_BG_OPACITY,
  isUsableUniconBgOpacity,
  resolveUniconBgOpacity,
  resolveUniconColor,
} from './native-theme'
import type { UniconProps } from './types'

export function Unicon(props: UniconProps): ReactElement {
  const { size = 32, className, icon, bare } = props
  const input = resolveUniconInput(props)
  const { colorIndex, paths } = useMemo(() => deriveUnicon(input), [input])

  const themeColor = useThemeVariable(`--unicon-${colorIndex}`)
  const themeBgOpacity = useThemeVariable('--unicon-bg-opacity')

  const color = resolveUniconColor(themeColor, colorIndex)
  if (__DEV__ && color !== themeColor) {
    // oxlint-disable-next-line no-console -- __DEV__-only diagnostic; a silently-wrong-theme avatar would otherwise slip through QA (the Shimmer.native fallback-warning precedent)
    console.warn(
      `Unicon: --unicon-${colorIndex} did not resolve to a simple hex (got ${JSON.stringify(themeColor)}); falling back to the static light palette. Check the uniwind theme wiring.`,
    )
  }

  const bgOpacity = resolveUniconBgOpacity(themeBgOpacity)
  if (__DEV__ && !isUsableUniconBgOpacity(themeBgOpacity)) {
    // oxlint-disable-next-line no-console -- __DEV__-only diagnostic, same shape as the color fallback warning above
    console.warn(
      `Unicon: --unicon-bg-opacity did not resolve to an opacity in [0, 1] (got ${JSON.stringify(themeBgOpacity)}); falling back to ${FALLBACK_UNICON_BG_OPACITY}. Check the uniwind theme wiring.`,
    )
  }

  const { scale, translate, iconSize } = uniconGeometry({ size, bare })

  return (
    <View className={className} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {!bare && <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} opacity={bgOpacity} />}
        {!icon && (
          <G transform={`translate(${translate}, ${translate}) scale(${scale})`}>
            {paths.map((d, i) => (
              <Path key={i} d={d} fill={color} clipRule="evenodd" fillRule="evenodd" />
            ))}
          </G>
        )}
      </Svg>
      {icon ? (
        // Centering via flexbox lands the icon box at the web leg's
        // `iconOffset` — both center the same `iconSize` square in `size`.
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.iconOverlay]}>
          <View style={[styles.iconBox, { width: iconSize, height: iconSize }]}>{icon}</View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    // Clip like the web leg's foreignObject viewport does — without this an
    // oversized custom icon overflows the avatar circle on native only.
    overflow: 'hidden',
  },
  iconOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
