import { ColorTokens, TouchableArea, type TouchableAreaCompatProps as TouchableAreaProps } from '@universe/mycelium'
import type { IconProps } from '@universe/mycelium/icons'
import { X } from '@universe/mycelium/icons/X'
import React from 'react'

type Props = {
  onPress: () => void
  size?: IconProps['size']
  strokeWidth?: number
  color?: ColorTokens
} & TouchableAreaProps

export function CloseButton({ onPress, size, strokeWidth, color, ...rest }: Props): JSX.Element {
  return (
    <TouchableArea {...rest} testID="buttons/close-button" onPress={onPress}>
      {/* Explicit fallback: TouchableAreaCompat only injects a default color into unmarked
          (non-mycelium) children, so a mycelium icon left uncolored loses the accent it used
          to inherit — $neutral1 is design's ratified replacement for that injected accent. */}
      <X color={color ?? '$neutral1'} size={size ?? '$icon.20'} strokeWidth={strokeWidth ?? 2} />
    </TouchableArea>
  )
}
