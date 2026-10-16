import { useState } from 'react'
import { ONE_SECOND_MS } from 'utilities/src/time/time'
import { useInterval } from 'utilities/src/time/timing'

const MS_IN_YEAR = 365 * 24 * 60 * 60 * ONE_SECOND_MS

interface UseLiveEarnRewardsUsdParams {
  /** Last fetched rewards value; the extrapolation snaps to it whenever it changes. */
  baseRewardsUsd: number | undefined
  /** USD earned per year at the current rate (deposited balance × APY). */
  annualRewardsRateUsd: number
  enabled?: boolean
}

interface LiveEarnRewardsUsd {
  valueUsd: number | undefined
  /** True while the value is actively ticking; callers render their static display otherwise. */
  isLive: boolean
}

/** The value/time the extrapolation grows from, plus the inputs it was computed for. */
interface Anchor {
  valueUsd: number | undefined
  atMs: number
  baseRewardsUsd: number | undefined
  rateUsd: number
  isLive: boolean
}

/**
 * Extrapolates a rewards value between refetches so it visibly accrues in real time,
 * ticking forward at the position's current rate — no extra polling.
 */
export function useLiveEarnRewardsUsd({
  baseRewardsUsd,
  annualRewardsRateUsd,
  enabled = true,
}: UseLiveEarnRewardsUsdParams): LiveEarnRewardsUsd {
  const isLive = enabled && baseRewardsUsd !== undefined && annualRewardsRateUsd > 0
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [storedAnchor, setAnchor] = useState<Anchor>(() => ({
    valueUsd: baseRewardsUsd,
    atMs: Date.now(),
    baseRewardsUsd,
    rateUsd: annualRewardsRateUsd,
    isLive,
  }))

  // Input transitions adjust the anchor via set-during-render so the very next frame is correct.
  // Object.is so a NaN input settles instead of re-firing setAnchor until React bails out.
  let anchor = storedAnchor
  if (!Object.is(storedAnchor.baseRewardsUsd, baseRewardsUsd)) {
    // Fresh server data: snap. An unchanged refetch skips this, so the display keeps accruing.
    anchor = { valueUsd: baseRewardsUsd, atMs: Date.now(), baseRewardsUsd, rateUsd: annualRewardsRateUsd, isLive }
    setAnchor(anchor)
  } else if (!Object.is(storedAnchor.rateUsd, annualRewardsRateUsd) || storedAnchor.isLive !== isLive) {
    // Fold the accrual-so-far (at the old rate) into the anchor so the display stays continuous —
    // no retroactive re-pricing of elapsed time, no jump when re-enabled after a disabled interval.
    const atMs = Date.now()
    const accruedUsd =
      storedAnchor.valueUsd !== undefined && storedAnchor.isLive
        ? (storedAnchor.rateUsd * (atMs - storedAnchor.atMs)) / MS_IN_YEAR
        : 0
    anchor = {
      valueUsd: storedAnchor.valueUsd === undefined ? undefined : storedAnchor.valueUsd + accruedUsd,
      atMs,
      baseRewardsUsd,
      rateUsd: annualRewardsRateUsd,
      isLive,
    }
    setAnchor(anchor)
  }

  useInterval(() => setNowMs(Date.now()), isLive ? ONE_SECOND_MS : null)

  // Not live: report the last fetched base — callers render their static display from it. The
  // folded anchor is kept internally only so resuming doesn't re-price the elapsed time.
  if (anchor.valueUsd === undefined || !isLive) {
    return { valueUsd: baseRewardsUsd, isLive: false }
  }
  // nowMs can lag a just-moved anchor until the next interval tick; never extrapolate backward.
  const elapsedMs = Math.max(0, nowMs - anchor.atMs)
  return {
    valueUsd: anchor.valueUsd + (annualRewardsRateUsd * elapsedMs) / MS_IN_YEAR,
    isLive: true,
  }
}
