import type { TextProps, TouchableAreaProps } from '@universe/mycelium'
import { BaseSyntheticEvent } from 'react'
import { GeneratedIcon, IconProps } from 'ui/src/components/factories/createIcon'

export type MenuContentItem = {
  label: string
  onPress: (e: BaseSyntheticEvent) => void
  textProps?: TextProps
  Icon?: GeneratedIcon | ((props: IconProps) => JSX.Element)
  iconProps?: IconProps
  iconPlacement?: 'left' | 'right'
  iconTextGap?: '$spacing16' | '$spacing8'
  destructive?: boolean
} & TouchableAreaProps
