import type { IconProps } from 'ui/src/components/factories/createIcon'

export type SpinningLoaderProps = {
  size?: number
  disabled?: boolean
  // Forwarded verbatim to the CircleSpinner icon, so the icon's own color surface is the
  // honest type (a superset of the legacy Tamagui ColorTokens union — no consumer breaks).
  color?: IconProps['color']
  unstyled?: boolean
}
