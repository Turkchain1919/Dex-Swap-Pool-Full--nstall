/**
 * `size` sets width/height and their min twins — no max twins, unlike `Square`.
 * Legacy `flex` is not CSS `flex`: any truthy value means `flexGrow: 1`.
 */
import { forwardRef } from 'react'
import type { View } from 'react-native'
import type { SizeValue } from '../compat/props'
import { FlexCompat } from '../flex-compat/FlexCompat'

export interface SpacerCompatProps {
  size?: SizeValue
  flex?: boolean | number
}

export const SpacerCompat = forwardRef<HTMLElement | View, SpacerCompatProps>(function SpacerCompat(
  { size = '$true', flex },
  ref,
) {
  return (
    <FlexCompat
      ref={ref}
      tag="span"
      pointerEvents="none"
      width={size}
      height={size}
      minWidth={size}
      minHeight={size}
      flexGrow={flex ? 1 : undefined}
    />
  )
})
