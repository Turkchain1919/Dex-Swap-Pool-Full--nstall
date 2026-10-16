import type { JSX } from 'react'
import { View, type ViewStyle } from 'react-native'
import { Shimmer } from '../shimmer'
import type { TextLoaderWrapperProps } from './TextLoaderWrapperProps'

/** The legacy `TextPlaceholder` geometry, as RN styles (the web leg's class twin). */
const PLACEHOLDER_ROW: ViewStyle = { flexDirection: 'row', alignItems: 'center' }
const PLACEHOLDER_BAR: ViewStyle = {
  position: 'absolute',
  top: '5%',
  right: 0,
  bottom: '5%',
  left: 0,
  borderRadius: 999999,
}

/**
 * Native `TextLoaderWrapper`: the legacy `ui/src` loading chrome
 * (`TextLoaderWrapper`/`TextPlaceholder` in `components/text/Text.tsx`) —
 * the original children hidden from screen readers (the legacy
 * `HiddenFromScreenReaders` native leg) under the rounded placeholder bar,
 * optionally wrapped in the shimmer sweep (the legacy `Skeleton`, whose
 * reanimated twin is mycelium's `Shimmer`). The bar's fill is the legacy
 * native `$surface2` (web uses surface3 — a legacy platform split kept
 * verbatim), as a semantic class so `Uniwind.setTheme()` still switches it.
 */
export function TextLoaderWrapper({ children, loadingShimmer }: TextLoaderWrapperProps): JSX.Element {
  const placeholder = (
    <View style={PLACEHOLDER_ROW} testID="text-placeholder">
      <View style={PLACEHOLDER_ROW}>
        <View accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
          {children}
        </View>
        {/* Object-literal spread because RN's ViewProps doesn't declare className, which uniwind resolves at runtime — the established mycelium native-leg pattern. */}
        <View style={PLACEHOLDER_BAR} {...{ className: 'bg-surface2' }} />
      </View>
    </View>
  )
  if (loadingShimmer) {
    return <Shimmer>{placeholder}</Shimmer>
  }
  return placeholder
}
