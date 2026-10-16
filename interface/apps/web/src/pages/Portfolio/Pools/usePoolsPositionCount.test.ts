import { PositionStatus } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import { usePoolsPositionCount } from '~/pages/Portfolio/Pools/usePoolsPositionCount'
import { renderHook } from '~/test-utils/render'

function position(status: PositionStatus): PositionInfo {
  return { status } as PositionInfo
}

type Params = Parameters<typeof usePoolsPositionCount>[0]

function makeParams(overrides: Partial<Params> = {}): Params {
  return {
    v2StatusFilter: ['open'],
    visiblePositions: [position(PositionStatus.IN_RANGE), position(PositionStatus.OUT_OF_RANGE)],
    totalPoolsCount: 5,
    hasLoadedPositions: true,
    hasNextPage: false,
    ...overrides,
  }
}

describe('usePoolsPositionCount', () => {
  it('mirrors the backend open count on the default open-only view, regardless of loaded rows', () => {
    const { result } = renderHook(() => usePoolsPositionCount(makeParams()))
    expect(result.current).toBe(5)
  })

  it('shows the backend open count immediately while pages are still loading', () => {
    const { result } = renderHook(() =>
      usePoolsPositionCount(makeParams({ hasNextPage: true, hasLoadedPositions: false })),
    )
    expect(result.current).toBe(5)
  })

  it('ignores loaded rows on the open-only view: the count tracks the balance, not the table', () => {
    const { result } = renderHook(() =>
      usePoolsPositionCount(makeParams({ visiblePositions: [position(PositionStatus.IN_RANGE)] })),
    )
    expect(result.current).toBe(5)
  })

  it('adds the fully loaded closed rows when the Closed lifecycle is selected', () => {
    const { result } = renderHook(() =>
      usePoolsPositionCount(
        makeParams({
          v2StatusFilter: ['open', 'closed'],
          visiblePositions: [
            position(PositionStatus.IN_RANGE),
            position(PositionStatus.CLOSED),
            position(PositionStatus.CLOSED),
          ],
        }),
      ),
    )
    expect(result.current).toBe(7)
  })

  it('keeps the open base and adds closed rows under a closed-only lifecycle', () => {
    const { result } = renderHook(() =>
      usePoolsPositionCount(
        makeParams({
          v2StatusFilter: ['closed'],
          visiblePositions: [position(PositionStatus.CLOSED)],
        }),
      ),
    )
    expect(result.current).toBe(6)
  })

  it('treats an empty lifecycle selection as full lifecycle, matching the request mapping', () => {
    const { result } = renderHook(() =>
      usePoolsPositionCount(
        makeParams({
          v2StatusFilter: [],
          visiblePositions: [position(PositionStatus.IN_RANGE), position(PositionStatus.CLOSED)],
        }),
      ),
    )
    expect(result.current).toBe(6)
  })

  it('returns undefined while closed pages remain', () => {
    const { result } = renderHook(() =>
      usePoolsPositionCount(makeParams({ v2StatusFilter: ['open', 'closed'], hasNextPage: true })),
    )
    expect(result.current).toBeUndefined()
  })

  it('returns undefined while closed rows are loading or errored', () => {
    const { result } = renderHook(() =>
      usePoolsPositionCount(makeParams({ v2StatusFilter: ['open', 'closed'], hasLoadedPositions: false })),
    )
    expect(result.current).toBeUndefined()
  })

  it('returns undefined when the backend count is missing', () => {
    const { result } = renderHook(() => usePoolsPositionCount(makeParams({ totalPoolsCount: undefined })))
    expect(result.current).toBeUndefined()
  })
})
