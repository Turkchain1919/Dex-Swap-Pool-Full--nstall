import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MAX_PERCENTAGE, SLIDER_RESOLUTION } from '~/features/Toucan/Shared/valuationSliderParts/constants'
import {
  snapToCanonicalValue,
  useValuationSlider,
} from '~/features/Toucan/Shared/valuationSliderParts/useValuationSlider'

const FLOOR = 1000n
const TICK = 100n
// clearing @ floor → the slider's 0% position (minPrice) is floor + 1 tick = 1100
const MIN_PRICE = FLOOR + TICK

function renderSlider(
  overrides: {
    maxBidPriceQ96?: bigint
    maxSliderPriceQ96?: bigint
    clearingPriceQ96?: bigint
    valueQ96?: bigint
    groupSizeTicks?: number
  } = {},
) {
  const { result } = renderHook(() =>
    useValuationSlider({
      valueQ96: overrides.valueQ96 ?? MIN_PRICE,
      onChangeQ96: vi.fn(),
      onInteractionStart: undefined,
      clearingPriceQ96: overrides.clearingPriceQ96 ?? FLOOR,
      floorPriceQ96: FLOOR,
      tickSizeQ96: TICK,
      maxSliderPriceQ96: overrides.maxSliderPriceQ96,
      maxBidPriceQ96: overrides.maxBidPriceQ96,
      tickGrouping: overrides.groupSizeTicks ? { groupSizeTicks: overrides.groupSizeTicks } : null,
      groupTicksEnabled: overrides.groupSizeTicks !== undefined,
    }),
  )
  return result
}

describe('useValuationSlider max bid price clamp', () => {
  it('uses the default range when no ceiling is imposed', () => {
    // Default range is MAX_PERCENTAGE of minPrice expressed in ticks, then capped at
    // the slider's own step resolution.
    const rangeTicks = Number((MIN_PRICE * BigInt(MAX_PERCENTAGE) + 100n * TICK - 1n) / (100n * TICK))
    expect(renderSlider().current.totalTicks).toBe(Math.min(rangeTicks, SLIDER_RESOLUTION))
  })

  it('narrows the track to the ceiling when the ceiling is below the default range', () => {
    // Ceiling 1500 leaves ticks 1200..1500 above minPrice 1100 → 4 steps.
    expect(renderSlider({ maxBidPriceQ96: 1500n }).current.totalTicks).toBe(4)
  })

  it('rounds the ceiling DOWN to a tick so the track cannot overshoot it', () => {
    // 1549 must behave like 1500, not 1600 — a step past the ceiling would revert.
    expect(renderSlider({ maxBidPriceQ96: 1549n }).current.totalTicks).toBe(
      renderSlider({ maxBidPriceQ96: 1500n }).current.totalTicks,
    )
  })

  it('ends the track BELOW the ceiling tick when clearing sits off the floor-anchored grid', () => {
    // minPrice here is clearing + tick = 1150, which is NOT on the floor grid, and the
    // ceiling 1560 is off-grid too. Floor-anchored, the highest legal tick is 1500, so the
    // track ends at 1450 — 3 steps. A bound derived from minPrice instead would give 4,
    // a top of 1550, which snaps to 1600 and reverts.
    //
    // The off-grid CEILING is what separates the two derivations. At 1500 both truncate to
    // 3 and the test passes either way — which is how the previous version of this case,
    // and the one below it, both went green against a naive bound.
    const result = renderSlider({ clearingPriceQ96: 1050n, maxBidPriceQ96: 1560n })

    expect(result.current.totalTicks).toBe(3)
    expect(result.current.minPriceQ96).toBe(1150n)
    expect((result.current.minPriceQ96 ?? 0n) + TICK * BigInt(result.current.totalTicks)).toBe(1450n)
  })

  it('recognises the top of the track when the top itself snaps DOWN off-grid', () => {
    // floor 1000 / tick 100 / clearing 1010 → minPrice 1110, off the floor grid. The track
    // is 3 steps, so its raw top is 1410 — but a value only ever exists snapped, and 1410
    // snaps to 1400. So the highest value the slider can actually hold is 1400, one tick
    // BELOW its own arithmetic top, and sliderIndex tops out at 2 of 3.
    //
    // Comparing the value against that unsnapped top calls this "not at the end", and the
    // drag-past-the-end hint can then never fire.
    const result = renderSlider({ clearingPriceQ96: 1010n, maxBidPriceQ96: 1500n, valueQ96: 1400n })

    expect(result.current.totalTicks).toBe(3)
    expect(result.current.minPriceQ96).toBe(1110n)
    expect(result.current.sanitizedValueQ96).toBe(1400n) // not 1410
    expect(result.current.isAtTrackMax).toBe(true)
  })

  it('recognises the top of the track when grouping moves it too', () => {
    // Ceiling 1800 narrows the track to 7 ticks above minPrice 1100. With a group stride of
    // 5 the reachable offsets are 0 and 5, so the highest value a drag can produce is 1600,
    // NOT the track's arithmetic top of 1800.
    //
    // The tick snap alone does not move 1800, so a top that skips the group snap sits two
    // strides above anything selectable and the drag-past-end hint can never fire. Both
    // sides go through the same snapping helper for exactly this reason.
    const result = renderSlider({ maxBidPriceQ96: 1800n, groupSizeTicks: 5, valueQ96: 1600n })

    expect(result.current.totalTicks).toBe(7)
    expect(result.current.sanitizedValueQ96).toBe(1600n)
    expect(result.current.isAtTrackMax).toBe(true)
  })

  it('reports the ceiling as the bound only when it is what narrows the track', () => {
    // Gates the "bids cannot exceed X" hint on a drag past the end. Without the second
    // case that hint would name a ceiling the track never reaches, because the default
    // range ran out first.
    expect(renderSlider({ maxBidPriceQ96: 1500n }).current.isCeilingBound).toBe(true)
    expect(renderSlider({ maxBidPriceQ96: MIN_PRICE * 10_000n }).current.isCeilingBound).toBe(false)
    expect(renderSlider().current.isCeilingBound).toBe(false)
  })

  it('never widens the track when the ceiling sits above the default range', () => {
    const withoutCeiling = renderSlider().current.totalTicks
    const withHugeCeiling = renderSlider({ maxBidPriceQ96: MIN_PRICE * 10_000n }).current.totalTicks
    expect(withHugeCeiling).toBe(withoutCeiling)
  })

  it('collapses the track when the ceiling is at or below the 0% position', () => {
    // Nothing is both strictly above clearing and under the ceiling, so the slider has
    // no position to offer and its consumers render nothing.
    expect(renderSlider({ maxBidPriceQ96: MIN_PRICE - 1n }).current.totalTicks).toBe(0)
  })

  it('still respects the ceiling when a low-FDV expansion widened the range', () => {
    // The low-FDV path supplies maxSliderPriceQ96; the ceiling must win when lower.
    expect(renderSlider({ maxSliderPriceQ96: 100_000n, maxBidPriceQ96: 1500n }).current.totalTicks).toBe(4)
  })

  it('never rounds a stride PAST the end of the track', () => {
    // An 8-tick track with a stride of 5: rounding to the nearest stride gives 10, two
    // ticks beyond the ceiling that narrowed the track. Unclamped, the thumb label would
    // quote a price above the stated maximum while the bid stayed clamped below it.
    const result = renderSlider({ maxBidPriceQ96: 1900n, groupSizeTicks: 5, valueQ96: 1900n })

    expect(result.current.totalTicks).toBe(8)
    expect(result.current.sanitizedValueQ96).toBe(1900n) // offset 8, not 10 (which is 2100)
    expect(result.current.isAtTrackMax).toBe(true)
  })
})

describe('snapToCanonicalValue', () => {
  // The producer and both readers share this, so its invariants are the ones that keep the
  // emitted price, the thumb label and the submitted price from disagreeing.
  const base = {
    floorPriceQ96: FLOOR,
    clearingPriceQ96: FLOOR,
    tickSizeQ96: TICK,
    minPriceQ96: MIN_PRICE,
    maxTickOffset: 8,
  }

  it('anchors on the floor grid, not on minPrice', () => {
    // clearing 1010 → minPrice 1110, off the grid. 1410 belongs to the floor-anchored 1400.
    expect(
      snapToCanonicalValue({
        ...base,
        clearingPriceQ96: 1010n,
        minPriceQ96: 1110n,
        value: 1410n,
        groupSizeTicks: undefined,
      }),
    ).toBe(1400n)
  })

  it('clamps a stride that would round past the track', () => {
    expect(snapToCanonicalValue({ ...base, value: 1900n, groupSizeTicks: 5 })).toBe(MIN_PRICE + TICK * 8n)
  })

  it('is idempotent, so reading a value back cannot move it', () => {
    const once = snapToCanonicalValue({ ...base, value: 1637n, groupSizeTicks: 5 })
    expect(snapToCanonicalValue({ ...base, value: once, groupSizeTicks: 5 })).toBe(once)
  })

  it('keeps a grouped result ON the tick grid when clearing is off it', () => {
    // clearing 1050 → minPrice 1150, off the floor grid. Striding from minPrice re-adds the
    // 50 the floor-anchored snap just removed, so an on-grid 2200 came back as 2150 — a
    // price on no tick at all. The label showed 2150 while the submit path re-snapped to
    // 2200, which is the two disagreeing again.
    const out = snapToCanonicalValue({
      value: 2200n,
      floorPriceQ96: FLOOR,
      clearingPriceQ96: 1050n,
      tickSizeQ96: TICK,
      minPriceQ96: 1150n,
      groupSizeTicks: 5,
      maxTickOffset: 20,
    })

    expect((out - FLOOR) % TICK).toBe(0n)
  })

  it('bounds an above-track value even with no grouping', () => {
    // snapToNearestTick has no upper bound, so without the hoisted clamp this came straight
    // back out and the thumb label quoted a price above the ceiling while the thumb itself
    // sat pinned at the end of the track.
    const out = snapToCanonicalValue({
      value: 9999n,
      floorPriceQ96: FLOOR,
      clearingPriceQ96: FLOOR,
      tickSizeQ96: TICK,
      minPriceQ96: MIN_PRICE,
      groupSizeTicks: undefined,
      maxTickOffset: 3,
    })

    expect(out).toBe(MIN_PRICE + TICK * 3n)
  })
})

describe('useValuationSlider grouping wider than the track', () => {
  it('ignores a stride the ceiling-narrowed track cannot express', () => {
    // groupSizeTicks comes from the chart's zoom level, so it can exceed a track the ceiling
    // has narrowed. With a stride of 20 over 3 ticks every offset rounds to 0: drags all
    // land on the bottom, the legal ticks under the ceiling become unselectable, and the
    // track's top collapses onto its bottom — leaving isAtTrackMax true at the very bottom.
    const atBottom = renderSlider({ maxBidPriceQ96: 1400n, groupSizeTicks: 20, valueQ96: MIN_PRICE })

    expect(atBottom.current.totalTicks).toBe(3)
    expect(atBottom.current.isAtTrackMax).toBe(false)

    const atTop = renderSlider({ maxBidPriceQ96: 1400n, groupSizeTicks: 20, valueQ96: 1400n })
    expect(atTop.current.sanitizedValueQ96).toBe(1400n)
    expect(atTop.current.isAtTrackMax).toBe(true)
  })
})

/**
 * Every review finding on this helper has been the same defect wearing a different hat: one
 * path computing a tick differently from another, in a combination no single test covered.
 * Six of them. Enumerating the combinations is the only thing that closes the category, so
 * rather than assert values, this asserts the properties that must hold everywhere.
 */
describe('useValuationSlider snapping invariants', () => {
  const CLEARINGS = [FLOOR, FLOOR + TICK / 2n, FLOOR + TICK / 10n, FLOOR + TICK * 3n]
  const STRIDES = [undefined, 1, 2, 5, 20]
  const CEILINGS = [1200n, 1300n, 1450n, 1900n, 2560n, 5000n]

  for (const clearingPriceQ96 of CLEARINGS) {
    for (const groupSizeTicks of STRIDES) {
      for (const maxBidPriceQ96 of CEILINGS) {
        const label = `clearing=${clearingPriceQ96} stride=${groupSizeTicks ?? 'none'} ceiling=${maxBidPriceQ96}`

        it(`holds its invariants — ${label}`, () => {
          const probe = (valueQ96: bigint) =>
            renderSlider({ clearingPriceQ96, groupSizeTicks, maxBidPriceQ96, valueQ96 })

          const base = probe(clearingPriceQ96 + TICK)
          const totalTicks = base.current.totalTicks
          if (totalTicks === 0) {
            return // the track is collapsed; the slider does not render at all
          }

          // Sweep the whole track plus a value beyond its end.
          for (let step = 0; step <= totalTicks + 2; step++) {
            const raw = clearingPriceQ96 + TICK * BigInt(step)
            const out = probe(raw).current.sanitizedValueQ96
            expect(out).toBeDefined()
            const value = out as bigint

            // 1. Always a real tick. A value off the grid reverts on chain.
            expect((value - FLOOR) % TICK).toBe(0n)

            // 2. Never above the ceiling the hook enforces.
            expect(value).toBeLessThanOrEqual(maxBidPriceQ96)

            // 3. Idempotent — the producer emits what the readers read back, unmoved.
            expect(probe(value).current.sanitizedValueQ96).toBe(value)
          }
        })
      }
    }
  }
})
