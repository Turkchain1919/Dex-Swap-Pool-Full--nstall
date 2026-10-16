import { act, renderHook } from '@testing-library/react'
import { useLiveEarnRewardsUsd } from 'uniswap/src/features/earn/hooks/useLiveEarnRewardsUsd'

// $1 per second, so expected values read directly as elapsed seconds.
const ONE_USD_PER_SECOND = 365 * 24 * 60 * 60

const advanceSeconds = (seconds: number): void => {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

describe(useLiveEarnRewardsUsd, () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticks forward at the annual rate', () => {
    const { result } = renderHook(() =>
      useLiveEarnRewardsUsd({ baseRewardsUsd: 100, annualRewardsRateUsd: ONE_USD_PER_SECOND }),
    )

    advanceSeconds(5)

    expect(result.current.isLive).toBe(true)
    expect(result.current.valueUsd).toBeCloseTo(105)
  })

  it('snaps to a fresh base value and keeps accruing on an unchanged refetch', () => {
    const { result, rerender } = renderHook(
      ({ baseRewardsUsd }) => useLiveEarnRewardsUsd({ baseRewardsUsd, annualRewardsRateUsd: ONE_USD_PER_SECOND }),
      { initialProps: { baseRewardsUsd: 100 } },
    )

    advanceSeconds(5)
    act(() => rerender({ baseRewardsUsd: 100 }))
    expect(result.current.valueUsd).toBeCloseTo(105)

    act(() => rerender({ baseRewardsUsd: 200 }))
    expect(result.current.valueUsd).toBeCloseTo(200)
  })

  it('does not re-price elapsed time when the rate changes', () => {
    const { result, rerender } = renderHook(
      ({ annualRewardsRateUsd }) => useLiveEarnRewardsUsd({ baseRewardsUsd: 100, annualRewardsRateUsd }),
      { initialProps: { annualRewardsRateUsd: ONE_USD_PER_SECOND } },
    )

    advanceSeconds(10)
    act(() => rerender({ annualRewardsRateUsd: 2 * ONE_USD_PER_SECOND }))
    advanceSeconds(5)

    // 10s at $1/s folded into the anchor, then 5s at $2/s — not 15s re-priced at $2/s.
    expect(result.current.valueUsd).toBeCloseTo(120)
  })

  it('freezes while disabled and resumes without jumping', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useLiveEarnRewardsUsd({ baseRewardsUsd: 100, annualRewardsRateUsd: ONE_USD_PER_SECOND, enabled }),
      { initialProps: { enabled: true } },
    )

    advanceSeconds(5)
    act(() => rerender({ enabled: false }))
    advanceSeconds(60)

    // Not live: reports the fetched base; the accrued extrapolation is held internally.
    expect(result.current.isLive).toBe(false)
    expect(result.current.valueUsd).toBeCloseTo(100)

    act(() => rerender({ enabled: true }))
    advanceSeconds(5)

    // Resumes from the accrual frozen at disable time — the disabled interval isn't re-priced.
    expect(result.current.valueUsd).toBeCloseTo(110)
  })

  it('ticks a negative base toward zero', () => {
    const { result } = renderHook(() =>
      useLiveEarnRewardsUsd({ baseRewardsUsd: -5, annualRewardsRateUsd: ONE_USD_PER_SECOND }),
    )

    advanceSeconds(2)

    expect(result.current.valueUsd).toBeCloseTo(-3)
  })

  it('settles on a NaN rate instead of re-rendering forever', () => {
    const { result, rerender } = renderHook(
      ({ annualRewardsRateUsd }) => useLiveEarnRewardsUsd({ baseRewardsUsd: 100, annualRewardsRateUsd }),
      { initialProps: { annualRewardsRateUsd: NaN } },
    )

    act(() => rerender({ annualRewardsRateUsd: NaN }))

    expect(result.current).toEqual({ valueUsd: 100, isLive: false })
  })

  it('is not live with a zero rate or an undefined base', () => {
    const zeroRate = renderHook(() => useLiveEarnRewardsUsd({ baseRewardsUsd: 100, annualRewardsRateUsd: 0 }))
    expect(zeroRate.result.current).toEqual({ valueUsd: 100, isLive: false })

    const noBase = renderHook(() =>
      useLiveEarnRewardsUsd({ baseRewardsUsd: undefined, annualRewardsRateUsd: ONE_USD_PER_SECOND }),
    )
    expect(noBase.result.current).toEqual({ valueUsd: undefined, isLive: false })
  })
})
