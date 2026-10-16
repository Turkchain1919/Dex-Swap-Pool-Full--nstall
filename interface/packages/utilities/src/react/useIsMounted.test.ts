import { renderHook } from '@testing-library/react'
import { useIsMounted } from 'utilities/src/react/useIsMounted'

describe('useIsMounted', () => {
  it('should return `false` on the first render', () => {
    const renderedValues: boolean[] = []

    renderHook(() => {
      renderedValues.push(useIsMounted())
    })

    expect(renderedValues[0]).toBe(false)
  })

  it('should return `true` once the mount effect has flushed', () => {
    const { result } = renderHook(() => useIsMounted())

    expect(result.current).toBe(true)
  })

  it('should stay `true` across re-renders', () => {
    const { result, rerender } = renderHook(() => useIsMounted())

    rerender()
    rerender()

    expect(result.current).toBe(true)
  })
})
