import { HEIGHT_BREAKPOINT_PX, useDeviceDimensions } from '@universe/mycelium/theme-hooks-compat'

type ChartDimensions = {
  chartHeight: number
  chartWidth: number
}

// TODO (MOB-1387): account for height in a more dynamic way to ensure
// that "Your balance" section will always show above the fold
export function useChartDimensions(): ChartDimensions {
  const { fullHeight, fullWidth } = useDeviceDimensions()

  const chartHeight = fullHeight < HEIGHT_BREAKPOINT_PX.short ? 130 : 215
  const chartWidth = fullWidth

  return {
    chartHeight,
    chartWidth,
  }
}
