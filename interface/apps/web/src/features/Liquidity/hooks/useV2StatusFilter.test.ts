import { act, renderHook } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { createElement, type ReactNode } from 'react'
import { DEFAULT_V2_POSITION_STATUS_FILTER } from '~/features/Liquidity/constants'
import { useV2StatusFilter } from '~/features/Liquidity/hooks/useV2StatusFilter'

// Fresh nuqs testing adapter (empty URL) per render so the lifecycle filter starts at its default.
function renderUseV2StatusFilter() {
  const wrapper = ({ children }: { children: ReactNode }) => createElement(NuqsTestingAdapter, null, children)
  return renderHook(() => useV2StatusFilter(), { wrapper })
}

describe('useV2StatusFilter', () => {
  it('exposes the default lifecycle filter', () => {
    const { result } = renderUseV2StatusFilter()

    expect(result.current.v2StatusFilter).toEqual(DEFAULT_V2_POSITION_STATUS_FILTER)
  })

  it('toggleV2Status adds a status that was absent', () => {
    const { result } = renderUseV2StatusFilter()

    act(() => result.current.toggleV2Status('closed'))

    expect(result.current.v2StatusFilter).toEqual(['open', 'closed'])
  })

  it('toggleV2Status removes a status that was present', () => {
    const { result } = renderUseV2StatusFilter()

    act(() => result.current.toggleV2Status('closed'))
    act(() => result.current.toggleV2Status('open'))

    expect(result.current.v2StatusFilter).toEqual(['closed'])
  })

  it('keeps at least one status selected — removing the last one is a no-op', () => {
    const { result } = renderUseV2StatusFilter()

    // Default is ['open']; removing it would empty the filter, which must be prevented.
    act(() => result.current.toggleV2Status('open'))

    expect(result.current.v2StatusFilter).toEqual(['open'])
  })

  it('resetV2Status restores the default', () => {
    const { result } = renderUseV2StatusFilter()

    act(() => result.current.toggleV2Status('closed'))
    act(() => result.current.resetV2Status())

    expect(result.current.v2StatusFilter).toEqual(DEFAULT_V2_POSITION_STATUS_FILTER)
  })
})
