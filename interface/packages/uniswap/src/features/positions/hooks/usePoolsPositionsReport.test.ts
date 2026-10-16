import { renderHook } from '@testing-library/react'
import { PositionStatus } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import {
  getPoolsPositionCounts,
  usePoolsPositionsReport,
} from 'uniswap/src/features/positions/hooks/usePoolsPositionsReport'
import type { PositionInfo } from 'uniswap/src/features/positions/types'
import { UniswapEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import type { Mock } from 'vitest'

vi.mock('uniswap/src/features/telemetry/send')
vi.mock('utilities/src/telemetry/trace/TraceContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('utilities/src/telemetry/trace/TraceContext')>()),
  useTrace: () => ({}),
}))

const position = (status: PositionStatus): PositionInfo => ({ status }) as unknown as PositionInfo

type ReportProps = Parameters<typeof usePoolsPositionsReport>[0]

function reportProps(overrides: Partial<ReportProps> & Pick<ReportProps, 'positions'>): ReportProps {
  return { lifecycleFilter: 'all', pagesLoaded: 1, hasMore: false, isLoading: false, enabled: true, ...overrides }
}

describe(getPoolsPositionCounts, () => {
  it('counts positions by range status and totals the set', () => {
    const counts = getPoolsPositionCounts([
      position(PositionStatus.IN_RANGE),
      position(PositionStatus.IN_RANGE),
      position(PositionStatus.OUT_OF_RANGE),
      position(PositionStatus.CLOSED),
    ])

    expect(counts).toEqual({ total: 4, inRange: 2, outOfRange: 1, closed: 1 })
  })

  it('returns all zeros for an empty set', () => {
    expect(getPoolsPositionCounts([])).toEqual({ total: 0, inRange: 0, outOfRange: 0, closed: 0 })
  })

  it('still counts a position in the total when its status is outside the known buckets', () => {
    const counts = getPoolsPositionCounts([position(PositionStatus.IN_RANGE), position(PositionStatus.UNSPECIFIED)])

    expect(counts).toEqual({ total: 2, inRange: 1, outOfRange: 0, closed: 0 })
  })
})

describe(usePoolsPositionsReport, () => {
  const mockSendAnalyticsEvent = sendAnalyticsEvent as Mock

  beforeEach(() => {
    mockSendAnalyticsEvent.mockClear()
  })

  it('fires once with the rendered counts, filters, and pagination state', () => {
    const positions = [
      position(PositionStatus.IN_RANGE),
      position(PositionStatus.OUT_OF_RANGE),
      position(PositionStatus.CLOSED),
    ]

    renderHook(() => usePoolsPositionsReport(reportProps({ positions, rangeFilter: 'in_range', hasMore: true })))

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(UniswapEventName.PoolsPositionsReport, {
      total_positions: 3,
      in_range_count: 1,
      out_of_range_count: 1,
      closed_count: 1,
      lifecycle_filter: 'all',
      range_filter: 'in_range',
      pages_loaded: 1,
      has_more: true,
    })
  })

  it('does not fire while the first page is still loading', () => {
    renderHook(() =>
      usePoolsPositionsReport(
        reportProps({ positions: [position(PositionStatus.IN_RANGE)], pagesLoaded: 0, hasMore: true, isLoading: true }),
      ),
    )

    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('does not fire while disabled, then fires once when it becomes enabled', () => {
    const positions = [position(PositionStatus.IN_RANGE)]
    const { rerender } = renderHook((props) => usePoolsPositionsReport(props), {
      initialProps: reportProps({ positions, enabled: false }),
    })

    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()

    rerender(reportProps({ positions }))

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
  })

  it('does not re-fire when the tab is re-opened with an unchanged set', () => {
    const positions = [position(PositionStatus.IN_RANGE)]
    const { rerender } = renderHook((props) => usePoolsPositionsReport(props), {
      initialProps: reportProps({ positions }),
    })

    rerender(reportProps({ positions, enabled: false }))
    rerender(reportProps({ positions }))

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
  })

  it('re-fires on re-open when the set changed while the tab was inactive', () => {
    const { rerender } = renderHook((props) => usePoolsPositionsReport(props), {
      initialProps: reportProps({ positions: [position(PositionStatus.IN_RANGE)] }),
    })

    rerender(reportProps({ positions: [position(PositionStatus.IN_RANGE)], enabled: false }))
    // A position flipped out of range while the tab was inactive -> re-open emits.
    rerender(reportProps({ positions: [position(PositionStatus.OUT_OF_RANGE)] }))

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(2)
  })

  it('re-fires with updated counts when pagination loads more positions', () => {
    const firstPage = [position(PositionStatus.IN_RANGE)]
    const { rerender } = renderHook((props) => usePoolsPositionsReport(props), {
      initialProps: reportProps({ positions: firstPage, hasMore: true }),
    })

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(mockSendAnalyticsEvent).toHaveBeenLastCalledWith(
      UniswapEventName.PoolsPositionsReport,
      expect.objectContaining({ total_positions: 1, pages_loaded: 1, has_more: true }),
    )

    const secondPage = [...firstPage, position(PositionStatus.OUT_OF_RANGE), position(PositionStatus.CLOSED)]
    rerender(reportProps({ positions: secondPage, pagesLoaded: 2 }))

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(2)
    expect(mockSendAnalyticsEvent).toHaveBeenLastCalledWith(
      UniswapEventName.PoolsPositionsReport,
      expect.objectContaining({
        total_positions: 3,
        out_of_range_count: 1,
        closed_count: 1,
        pages_loaded: 2,
        has_more: false,
      }),
    )
  })

  it('re-fires when the lifecycle filter changes even if the counts are unchanged', () => {
    const positions = [position(PositionStatus.IN_RANGE)]
    const { rerender } = renderHook((props) => usePoolsPositionsReport(props), {
      initialProps: reportProps({ positions, lifecycleFilter: 'open' }),
    })

    rerender(reportProps({ positions }))

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(2)
    expect(mockSendAnalyticsEvent).toHaveBeenLastCalledWith(
      UniswapEventName.PoolsPositionsReport,
      expect.objectContaining({ total_positions: 1, lifecycle_filter: 'all' }),
    )
  })

  it('does not re-fire when re-rendered with the same positions reference', () => {
    const positions = [position(PositionStatus.IN_RANGE)]
    const { rerender } = renderHook((props) => usePoolsPositionsReport(props), {
      initialProps: reportProps({ positions }),
    })

    rerender(reportProps({ positions }))

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
  })

  it('does not re-fire when a refetch yields a new array with unchanged counts', () => {
    const { rerender } = renderHook((props) => usePoolsPositionsReport(props), {
      initialProps: reportProps({ positions: [position(PositionStatus.IN_RANGE)] }),
    })

    // New array reference (as React Query produces on a poll), same counts -> suppressed.
    rerender(reportProps({ positions: [position(PositionStatus.IN_RANGE)] }))

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
  })

  it('re-fires when a position changes range status without changing the total', () => {
    const { rerender } = renderHook((props) => usePoolsPositionsReport(props), {
      initialProps: reportProps({ positions: [position(PositionStatus.IN_RANGE)] }),
    })

    rerender(reportProps({ positions: [position(PositionStatus.OUT_OF_RANGE)] }))

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(2)
    expect(mockSendAnalyticsEvent).toHaveBeenLastCalledWith(
      UniswapEventName.PoolsPositionsReport,
      expect.objectContaining({ total_positions: 1, in_range_count: 0, out_of_range_count: 1 }),
    )
  })
})
