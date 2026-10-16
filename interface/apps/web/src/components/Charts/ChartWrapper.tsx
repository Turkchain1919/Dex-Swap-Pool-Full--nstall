import { styled } from '@universe/mycelium/styled'
import type { ComponentPropsWithoutRef } from 'react'

const ChartWrapperFrame = styled('div', {
  platform: 'web',
  base: 'relative w-full overflow-visible',
})

export function ChartWrapper({
  height,
  style,
  ...rest
}: { height: number } & ComponentPropsWithoutRef<typeof ChartWrapperFrame>): JSX.Element {
  return <ChartWrapperFrame style={{ height, ...style }} {...rest} />
}
