import { renderHook } from '@testing-library/react-native'
import { HEIGHT_BREAKPOINT_PX } from '@universe/mycelium/theme-hooks-compat'
import { Dimensions } from 'react-native'
import { useChartDimensions } from 'src/components/PriceExplorer/useChartDimensions'

const sharedDimensions = {
  height: 1000,
  width: 1000,
  scale: 1,
  fontScale: 1,
}

describe(useChartDimensions, () => {
  it('returns small chart height for small screens', () => {
    vi.spyOn(Dimensions, 'get').mockReturnValue({ ...sharedDimensions, height: HEIGHT_BREAKPOINT_PX.short - 1 })
    const { result } = renderHook(() => useChartDimensions())

    expect(result.current).toEqual({
      chartHeight: 130,
      chartWidth: 1000,
    })
  })

  it('returns large chart height for large screens', () => {
    vi.spyOn(Dimensions, 'get').mockReturnValue({ ...sharedDimensions, height: HEIGHT_BREAKPOINT_PX.short })
    const { result } = renderHook(() => useChartDimensions())

    expect(result.current).toEqual({
      chartHeight: 215,
      chartWidth: 1000,
    })
  })
})
