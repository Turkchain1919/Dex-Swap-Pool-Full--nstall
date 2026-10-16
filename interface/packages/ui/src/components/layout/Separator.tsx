/**
 * Platform-split base stub — bundlers resolve `Separator.web` /
 * `Separator.native`. Shared types live here; the shared prop-resolution
 * helpers live in ./separatorStyles.
 */
import type { ReactNode } from 'react'
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native'
import type { ColorTokenValue, InsetValue, SpacingTokenValue } from 'ui/src/components/layout/separatorStyles'
import { PlatformSplitStubError } from 'utilities/src/errors'

export type SeparatorProps = {
  vertical?: boolean
  my?: SpacingTokenValue
  mx?: SpacingTokenValue
  mt?: SpacingTokenValue
  mb?: SpacingTokenValue
  width?: DimensionValue
  backgroundColor?: ColorTokenValue
  borderColor?: ColorTokenValue
  borderBottomWidth?: number
  position?: ViewStyle['position']
  top?: InsetValue
  left?: InsetValue
  right?: InsetValue
  /**
   * Style overrides applied at or below the `$md` breakpoint (max-width 640px),
   * matching the legacy Tamagui media prop's boundary behavior.
   */
  $md?: { display?: 'none' | 'flex' }
  testID?: string
  /** Tamagui `styled(Separator, ...)` wrappers forward testID as data-testid on web. */
  'data-testid'?: string
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

/**
 * Thin divider line, horizontal by default, `vertical` to flip.
 * Hand-rolled off Tamagui — a plain `div` on web (inline styles only, mirroring
 * the legacy Tamagui cascade output exactly; Separator.web.tsx) and a React
 * Native `View` on native (Separator.native.tsx).
 */
export function Separator(_props: SeparatorProps): JSX.Element {
  throw new PlatformSplitStubError('Separator')
}

Separator.displayName = 'Separator'
