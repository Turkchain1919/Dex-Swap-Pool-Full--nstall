import type { FlexProps } from '@universe/mycelium'
export type ShineProps = {
  shimmerDurationSeconds?: number
  disabled?: boolean
  children: JSX.Element
} & Omit<FlexProps, 'children'>
