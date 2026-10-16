import type { QRCodeErrorCorrectionLevel } from 'qrcode'
import type { SporeColorToken } from 'ui/src/theme/color/types'

export type BaseQRProps = {
  ecl?: QRCodeErrorCorrectionLevel
  size: number
  color: string
}

/**
 * Replaces the legacy Tamagui `ColorTokens` annotation: a Spore color token
 * (e.g. `$surface1`) or a raw CSS color. Existing call sites pass
 * `useSporeColors()` `.val` values (token-typed, resolved at runtime), so both
 * shapes must resolve.
 */
export type QRCodeContainerColor = SporeColorToken | (string & {})

export type QRCodeDisplayProps = BaseQRProps & {
  encodedValue: string
  containerBackgroundColor?: QRCodeContainerColor
}
