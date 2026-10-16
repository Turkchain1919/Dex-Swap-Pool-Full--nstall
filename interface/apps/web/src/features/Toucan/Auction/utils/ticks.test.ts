import { QUICK_LAUNCH_TOTAL_SUPPLY_RAW } from '@uniswap/liquidity-launcher-sdk'
import { priceToQ96WithDecimals, Q96, q96ToPriceString } from '~/features/Toucan/Auction/BidDistributionChart/utils/q96'
import {
  calculateMaxValidBidQ96,
  calculateMinValidBidQ96,
  calculateQuickLaunchMaxBidQ96,
  isBidBelowMinimum,
  isMaxBidPriceReached,
  QUICK_LAUNCH_MAX_BID_FDV_ETH,
  QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96,
  snapToNearestTick,
} from '~/features/Toucan/Auction/utils/ticks'

describe('calculateMinValidBidQ96', () => {
  // Using simple numbers for readability: floor=1000, tickSize=100
  const floor = 1000n
  const tickSize = 100n

  it('returns floor + 1 tick when clearing price equals floor (auction start)', () => {
    // Clearing @ 1000 → min bid = 1100
    const result = calculateMinValidBidQ96({
      clearingPriceQ96: floor,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(1100n)
  })

  it('returns next tick above when clearing price is between ticks', () => {
    // Clearing @ 1150 → min bid = 1200
    const result = calculateMinValidBidQ96({
      clearingPriceQ96: 1150n,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(1200n)
  })

  it('returns clearing + 1 tick when clearing price is exactly at a tick boundary', () => {
    // Clearing @ 1200 → min bid = 1300 (must be strictly above)
    const result = calculateMinValidBidQ96({
      clearingPriceQ96: 1200n,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(1300n)
  })

  it('handles clearing price just below a tick boundary', () => {
    // Clearing @ 1199 → min bid = 1200
    const result = calculateMinValidBidQ96({
      clearingPriceQ96: 1199n,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(1200n)
  })

  it('handles clearing price just above a tick boundary', () => {
    // Clearing @ 1201 → min bid = 1300
    const result = calculateMinValidBidQ96({
      clearingPriceQ96: 1201n,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(1300n)
  })

  it('returns clearingPrice + 1 when tickSize is zero or negative', () => {
    const result = calculateMinValidBidQ96({
      clearingPriceQ96: 1500n,
      floorPriceQ96: floor,
      tickSizeQ96: 0n,
    })
    expect(result).toBe(1501n)
  })
})

describe('isBidBelowMinimum', () => {
  const floor = 1000n
  const tickSize = 100n

  it('returns true for bid at clearing price (not strictly above)', () => {
    // Clearing @ 1200, bid @ 1200 → invalid (must be strictly above)
    const result = isBidBelowMinimum({
      bidPriceQ96: 1200n,
      clearingPriceQ96: 1200n,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(true)
  })

  it('returns true for bid below minimum valid tick', () => {
    // Clearing @ 1200, min valid = 1300, bid @ 1250 → invalid
    const result = isBidBelowMinimum({
      bidPriceQ96: 1250n,
      clearingPriceQ96: 1200n,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(true)
  })

  it('returns false for bid at minimum valid tick', () => {
    // Clearing @ 1200, min valid = 1300, bid @ 1300 → valid
    const result = isBidBelowMinimum({
      bidPriceQ96: 1300n,
      clearingPriceQ96: 1200n,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(false)
  })

  it('returns false for bid above minimum valid tick', () => {
    // Clearing @ 1200, min valid = 1300, bid @ 1400 → valid
    const result = isBidBelowMinimum({
      bidPriceQ96: 1400n,
      clearingPriceQ96: 1200n,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(false)
  })
})

describe('snapToNearestTick', () => {
  const floor = 1000n
  const tickSize = 100n

  it('returns value unchanged if already on a valid tick', () => {
    // Value @ 1300, clearing @ 1100 → snaps to 1300
    const result = snapToNearestTick({
      value: 1300n,
      floorPrice: floor,
      clearingPrice: 1100n,
      tickSize,
    })
    expect(result).toBe(1300n)
  })

  it('rounds to nearest tick (round down)', () => {
    // Value @ 1340, clearing @ 1100 → snaps to 1300
    const result = snapToNearestTick({
      value: 1340n,
      floorPrice: floor,
      clearingPrice: 1100n,
      tickSize,
    })
    expect(result).toBe(1300n)
  })

  it('rounds to nearest tick (round up)', () => {
    // Value @ 1360, clearing @ 1100 → snaps to 1400
    const result = snapToNearestTick({
      value: 1360n,
      floorPrice: floor,
      clearingPrice: 1100n,
      tickSize,
    })
    expect(result).toBe(1400n)
  })

  it('snaps to minimum valid bid when value is below clearing price', () => {
    // Value @ 1050, clearing @ 1200 → min valid = 1300, snaps to 1300
    const result = snapToNearestTick({
      value: 1050n,
      floorPrice: floor,
      clearingPrice: 1200n,
      tickSize,
    })
    expect(result).toBe(1300n)
  })

  it('snaps to minimum valid bid when snapped value would be at clearing price', () => {
    // Value @ 1200, clearing @ 1200 → snaps to 1200 but must be > clearing, so 1300
    const result = snapToNearestTick({
      value: 1200n,
      floorPrice: floor,
      clearingPrice: 1200n,
      tickSize,
    })
    expect(result).toBe(1300n)
  })

  it('returns value unchanged when tickSize is zero', () => {
    const result = snapToNearestTick({
      value: 1234n,
      floorPrice: floor,
      clearingPrice: 1100n,
      tickSize: 0n,
    })
    expect(result).toBe(1234n)
  })
})

describe('QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96', () => {
  it('is the 25,000 ETH FDV spread over the preset supply, floored, = 2^96 / 40,000', () => {
    // 25_000 ETH-wei FDV / 1e27 raw supply = 2.5e-5 ETH-wei per token-wei.
    expect(QUICK_LAUNCH_MAX_BID_FDV_ETH).toBe(25_000n)
    expect(QUICK_LAUNCH_TOTAL_SUPPLY_RAW).toBe(10n ** 27n)
    expect(QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96).toBe(Q96 / 40_000n)
    expect(QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96).toBe(1_980_704_062_856_608_439_838_598n)
  })

  it('round-trips back to the intended FDV within integer-floor loss', () => {
    const fdvWei = (QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 * QUICK_LAUNCH_TOTAL_SUPPLY_RAW) / Q96
    const targetWei = QUICK_LAUNCH_MAX_BID_FDV_ETH * 10n ** 18n
    expect(fdvWei <= targetWei).toBe(true)
    // The cap's integer floor costs at most 1 wei of the 2.5e22-wei target FDV.
    expect(targetWei - fdvWei <= 1n).toBe(true)
  })

  it('sits far above the quick-launch preset floor', () => {
    // The preset floor is a ~$1k FDV (0.4 ETH at the $2.5k/ETH fallback): floorQ96 =
    // 0.4e18 × 2^96 / 1e27. The 25,000 ETH cap is 62,500× that — ordinary bids never hit the
    // minValid clamp.
    const presetFloorQ96 = (4n * 10n ** 17n * Q96) / QUICK_LAUNCH_TOTAL_SUPPLY_RAW
    expect(QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 > presetFloorQ96 * 1_000n).toBe(true)
  })
})

describe('calculateQuickLaunchMaxBidQ96', () => {
  const floor = 1000n
  const tickSize = 100n

  it('snaps the FDV cap down onto the floor-anchored tick grid', () => {
    const result = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: floor,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    // On the grid, within one tick below the cap (never above — snapping up would overshoot the
    // 25,000 ETH FDV product cap), and strictly above clearing.
    expect((result - floor) % tickSize).toBe(0n)
    expect(result <= QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96).toBe(true)
    expect(QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 - result < tickSize).toBe(true)
    expect(result > floor).toBe(true)
  })

  it('is always strictly above the clearing price (contract requirement)', () => {
    const clearing = 1150n
    const result = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: clearing,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result > clearing).toBe(true)
    expect(
      isBidBelowMinimum({
        bidPriceQ96: result,
        clearingPriceQ96: clearing,
        floorPriceQ96: floor,
        tickSizeQ96: tickSize,
      }),
    ).toBe(false)
  })

  it('does not move with the clearing price while below the cap (the old 50x ceiling did)', () => {
    const atFloor = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: floor,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    // Clearing at 200x the floor — beyond the old multiple, which would have capped the
    // submitted maxPrice below a later clearing and silently dropped the bid; the fixed cap
    // keeps it included.
    const bidUp = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: floor * 200n,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(bidUp).toBe(atFloor)
    expect(bidUp > floor * 200n).toBe(true)
  })

  it('clamps up to the minimum valid bid when clearing already implies an FDV above the cap', () => {
    // Clearing one tick past the cap: the snapped cap is no longer strictly above clearing, so
    // the bid goes in minimally-above-clearing instead of failing (the stated clamp semantics).
    const cappedTicks = (QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 - floor) / tickSize
    const clearing = floor + (cappedTicks + 1n) * tickSize
    const result = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: clearing,
      floorPriceQ96: floor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(
      calculateMinValidBidQ96({ clearingPriceQ96: clearing, floorPriceQ96: floor, tickSizeQ96: tickSize }),
    )
    expect(result).toBe(clearing + tickSize)
    expect(result > QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96).toBe(true)
  })

  it('never returns below the contract minimum valid bid', () => {
    // Floor above the cap: grid snapping can't reach the target, so the minimum-valid clamp
    // (first tick strictly above clearing) takes over.
    const bigFloor = tickSize * 2n ** 80n
    expect(bigFloor > QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96).toBe(true)
    const result = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: bigFloor,
      floorPriceQ96: bigFloor,
      tickSizeQ96: tickSize,
    })
    expect(result).toBe(
      calculateMinValidBidQ96({ clearingPriceQ96: bigFloor, floorPriceQ96: bigFloor, tickSizeQ96: tickSize }),
    )
    expect(result).toBe(bigFloor + tickSize)
  })

  it('clamps to the minimum valid bid when the tick grid is too coarse to express the cap', () => {
    // Tick size exceeds cap − floor: the snap truncates to the floor, so the minValid clamp
    // yields the one-tick-above-clearing ceiling — which may exceed the cap (the contract
    // requires strictly-above-clearing).
    const coarseTick = QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96
    expect(coarseTick > QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 - floor).toBe(true)
    const result = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: floor,
      floorPriceQ96: floor,
      tickSizeQ96: coarseTick,
    })
    expect(result).toBe(
      calculateMinValidBidQ96({ clearingPriceQ96: floor, floorPriceQ96: floor, tickSizeQ96: coarseTick }),
    )
    expect(result).toBe(floor + coarseTick)
    expect(result > QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96).toBe(true)
  })

  it('clamps to the minimum valid bid on a degenerate zero floor', () => {
    const result = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: 0n,
      floorPriceQ96: 0n,
      tickSizeQ96: QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 * 2n,
    })
    expect(result).toBe(QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96 * 2n)
  })

  it('returns the cap itself when tickSize is zero', () => {
    const result = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: 1500n,
      floorPriceQ96: floor,
      tickSizeQ96: 0n,
    })
    expect(result).toBe(QUICK_LAUNCH_MAX_BID_PRICE_FDV_CAP_Q96)
  })
})

describe('quick-launch ceiling display round-trip', () => {
  // The bid-form ceiling peg (useBidFormController) settles on Q96 equality: it writes the
  // formatted ceiling into the field and expects the field's parse → snap pipeline to land
  // exactly back on the ceiling tick. This pins that invariant at realistic Q96 magnitudes.
  it('format → parse → snap lands exactly back on the ceiling tick', () => {
    const bidTokenDecimals = 18
    const auctionTokenDecimals = 18
    const floorPrice = Q96 / 10n ** 6n // 1e-6 bid tokens per auction token
    const tickSize = floorPrice / 100n
    const clearingPrice = floorPrice + 37n * tickSize + tickSize / 3n // off-grid clearing

    const ceiling = calculateQuickLaunchMaxBidQ96({
      clearingPriceQ96: clearingPrice,
      floorPriceQ96: floorPrice,
      tickSizeQ96: tickSize,
    })

    // Format the ceiling the way the controller does...
    const display = q96ToPriceString({ q96Value: ceiling, bidTokenDecimals, auctionTokenDecimals })

    // ...then parse it back the way the field does (decimal string → raw bid-token units → Q96)
    const [whole = '0', frac = ''] = display.split('.')
    const priceRaw = BigInt(whole + frac.padEnd(bidTokenDecimals, '0').slice(0, bidTokenDecimals))
    const parsedQ96 = priceToQ96WithDecimals({ priceRaw, auctionTokenDecimals })
    const snapped = snapToNearestTick({
      value: parsedQ96,
      floorPrice,
      clearingPrice,
      tickSize,
    })

    expect(snapped).toBe(ceiling)
  })
})

describe('calculateMaxValidBidQ96', () => {
  const floor = 1000n
  const tickSize = 100n

  it('returns the ceiling itself when it lands exactly on a tick', () => {
    expect(calculateMaxValidBidQ96({ maxBidPriceQ96: 1500n, floorPriceQ96: floor, tickSizeQ96: tickSize })).toBe(1500n)
  })

  it('rounds DOWN to the tick below when the ceiling sits between ticks', () => {
    // Rounding up to 1600 would exceed the hook's limit and revert.
    expect(calculateMaxValidBidQ96({ maxBidPriceQ96: 1599n, floorPriceQ96: floor, tickSizeQ96: tickSize })).toBe(1500n)
  })

  it('returns the floor when the ceiling is under the first tick above it', () => {
    expect(calculateMaxValidBidQ96({ maxBidPriceQ96: 1099n, floorPriceQ96: floor, tickSizeQ96: tickSize })).toBe(floor)
  })

  it('returns undefined when the ceiling is below the floor price', () => {
    // Guards BigInt truncation-toward-zero, which would otherwise report the floor
    // itself (above the ceiling) as valid.
    expect(
      calculateMaxValidBidQ96({ maxBidPriceQ96: 999n, floorPriceQ96: floor, tickSizeQ96: tickSize }),
    ).toBeUndefined()
  })

  it('returns the raw ceiling when tick size is non-positive', () => {
    expect(calculateMaxValidBidQ96({ maxBidPriceQ96: 1599n, floorPriceQ96: floor, tickSizeQ96: 0n })).toBe(1599n)
  })
})

describe('isMaxBidPriceReached', () => {
  const floor = 1000n
  const tickSize = 100n

  it('is false at auction start with headroom under the ceiling', () => {
    // clearing @ floor → min valid bid 1100, ceiling tick 1500
    expect(
      isMaxBidPriceReached({
        clearingPriceQ96: floor,
        floorPriceQ96: floor,
        tickSizeQ96: tickSize,
        maxBidPriceQ96: 1500n,
      }),
    ).toBe(false)
  })

  it('is false while exactly one valid tick remains', () => {
    // clearing @ 1400 → min valid bid 1500, which is still the ceiling tick
    expect(
      isMaxBidPriceReached({
        clearingPriceQ96: 1400n,
        floorPriceQ96: floor,
        tickSizeQ96: tickSize,
        maxBidPriceQ96: 1500n,
      }),
    ).toBe(false)
  })

  it('is true once clearing reaches the last tick under the ceiling', () => {
    // clearing @ 1500 → min valid bid 1600 > ceiling tick 1500
    expect(
      isMaxBidPriceReached({
        clearingPriceQ96: 1500n,
        floorPriceQ96: floor,
        tickSizeQ96: tickSize,
        maxBidPriceQ96: 1500n,
      }),
    ).toBe(true)
  })

  it('is true when clearing has passed the ceiling entirely', () => {
    expect(
      isMaxBidPriceReached({
        clearingPriceQ96: 2000n,
        floorPriceQ96: floor,
        tickSizeQ96: tickSize,
        maxBidPriceQ96: 1500n,
      }),
    ).toBe(true)
  })

  it('is true when the ceiling is below the floor price', () => {
    expect(
      isMaxBidPriceReached({
        clearingPriceQ96: floor,
        floorPriceQ96: floor,
        tickSizeQ96: tickSize,
        maxBidPriceQ96: 999n,
      }),
    ).toBe(true)
  })

  it('does not fire merely because the ceiling is between ticks', () => {
    // Ceiling 1649 rounds down to 1600; clearing @ 1400 leaves 1500 and 1600 open.
    expect(
      isMaxBidPriceReached({
        clearingPriceQ96: 1400n,
        floorPriceQ96: floor,
        tickSizeQ96: tickSize,
        maxBidPriceQ96: 1649n,
      }),
    ).toBe(false)
  })
})
