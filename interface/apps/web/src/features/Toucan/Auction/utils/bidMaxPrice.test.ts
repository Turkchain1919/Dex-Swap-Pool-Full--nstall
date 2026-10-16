import { priceToQ96WithDecimals } from '~/features/Toucan/Auction/BidDistributionChart/utils/q96'
import { computeBidMaxPriceQ96 } from '~/features/Toucan/Auction/utils/bidMaxPrice'

const AUCTION_TOKEN_DECIMALS = 18
const FLOOR = priceToQ96WithDecimals({ priceRaw: 1000n, auctionTokenDecimals: AUCTION_TOKEN_DECIMALS })
const TICK = priceToQ96WithDecimals({ priceRaw: 100n, auctionTokenDecimals: AUCTION_TOKEN_DECIMALS })

/** The raw bid-token amount whose Q96 price is `q96`, so fixtures can be written in Q96. */
function rawFor(q96: bigint): bigint {
  return q96 / (priceToQ96WithDecimals({ priceRaw: 1n, auctionTokenDecimals: AUCTION_TOKEN_DECIMALS }) / 1n)
}

const base = {
  auctionTokenDecimals: AUCTION_TOKEN_DECIMALS,
  clearingPriceQ96: FLOOR,
  floorPriceQ96: FLOOR,
  tickSizeQ96: TICK,
}

describe('computeBidMaxPriceQ96', () => {
  it('returns undefined without an amount', () => {
    expect(computeBidMaxPriceQ96({ ...base, rawAmount: undefined, maxBidPriceQ96: undefined })).toBeUndefined()
  })

  it('passes zero through', () => {
    expect(computeBidMaxPriceQ96({ ...base, rawAmount: 0n, maxBidPriceQ96: undefined })).toBe(0n)
  })

  it('snaps to the tick grid when no ceiling is imposed', () => {
    // Clearing at floor → min valid bid is floor + 1 tick, so anything at/below that snaps up.
    const result = computeBidMaxPriceQ96({ ...base, rawAmount: rawFor(FLOOR), maxBidPriceQ96: undefined })
    expect(result).toBe(FLOOR + TICK)
  })

  it('clamps an over-ceiling value to the highest legal tick', () => {
    // This is the invariant the blur-time check cannot be trusted for: every non-keyboard
    // write path suppresses the blur snap, so the clamp has to live here.
    const ceiling = FLOOR + TICK * 3n
    const result = computeBidMaxPriceQ96({
      ...base,
      rawAmount: rawFor(FLOOR + TICK * 50n),
      maxBidPriceQ96: ceiling,
    })
    expect(result).toBe(ceiling)
  })

  it('leaves an at-ceiling value untouched', () => {
    const ceiling = FLOOR + TICK * 3n
    expect(computeBidMaxPriceQ96({ ...base, rawAmount: rawFor(ceiling), maxBidPriceQ96: ceiling })).toBe(ceiling)
  })

  it('leaves an under-ceiling value untouched', () => {
    const ceiling = FLOOR + TICK * 5n
    const target = FLOOR + TICK * 2n
    expect(computeBidMaxPriceQ96({ ...base, rawAmount: rawFor(target), maxBidPriceQ96: ceiling })).toBe(target)
  })

  it('clamps DOWN to the tick below when the ceiling sits between ticks', () => {
    // Rounding up to the next tick would exceed the hook's limit and revert.
    const ceiling = FLOOR + TICK * 3n + TICK / 2n
    const result = computeBidMaxPriceQ96({
      ...base,
      rawAmount: rawFor(FLOOR + TICK * 50n),
      maxBidPriceQ96: ceiling,
    })
    expect(result).toBe(FLOOR + TICK * 3n)
  })

  it('does not snap when the tick grid is unknown', () => {
    const raw = rawFor(FLOOR + TICK * 2n)
    expect(computeBidMaxPriceQ96({ ...base, tickSizeQ96: undefined, rawAmount: raw, maxBidPriceQ96: undefined })).toBe(
      priceToQ96WithDecimals({ priceRaw: raw, auctionTokenDecimals: AUCTION_TOKEN_DECIMALS }),
    )
  })

  it('refuses to round UP past the ceiling', () => {
    // Grid: floor 1000, tick 100. Ceiling 1380 (off-grid) → highest legal tick 1300.
    // Entry 1360 is UNDER the ceiling but past the 1350 midpoint, so snapping wants 1400.
    // That excess is snapping's, not the user's, so it comes back to 1300.
    const ceiling = FLOOR + TICK * 3n + (TICK * 4n) / 5n
    const result = computeBidMaxPriceQ96({ ...base, rawAmount: 1360n, maxBidPriceQ96: ceiling })
    expect(result).toBe(FLOOR + TICK * 3n)
  })

  it('caps an over-ceiling entry that snapping would round DOWN', () => {
    // Ceiling 1120 (off-grid) → highest legal tick 1100. Entry 1140 is over the ceiling but
    // snaps DOWN to 1100 on its own. Same destination either way, but it must arrive there
    // by the cap: the entry was over, and nothing may leave the field holding it.
    const ceiling = FLOOR + TICK + TICK / 5n
    const result = computeBidMaxPriceQ96({ ...base, rawAmount: 1140n, maxBidPriceQ96: ceiling })

    expect(result).toBe(FLOOR + TICK)
    expect(result).toBeLessThanOrEqual(ceiling)
  })

  it('caps an over-ceiling entry rather than snapping it further up', () => {
    // Raw units against this file's grid: floor 1000, tick 100, ceiling tick 1300, next 1400.
    // 1360 is over the ceiling AND past the 1350 midpoint, so plain snapping rounds it UP to
    // 1400 — higher than the ceiling and higher than what was typed. The cap wins.
    const ceiling = FLOOR + TICK * 3n
    const result = computeBidMaxPriceQ96({ ...base, rawAmount: 1360n, maxBidPriceQ96: ceiling })

    expect(result).toBe(ceiling)
    expect(result).toBeLessThan(FLOOR + TICK * 4n)
  })

  it('clamp mode (the submit path) still clamps a genuinely over-ceiling entry', () => {
    const ceiling = FLOOR + TICK * 3n
    const result = computeBidMaxPriceQ96({
      ...base,
      rawAmount: rawFor(FLOOR + TICK * 50n),
      maxBidPriceQ96: ceiling,
    })
    expect(result).toBe(ceiling)
  })

  it('never rounds UP past an off-grid ceiling in the upper half of a tick', () => {
    // The fiat-mode divergence: with floor 1000, tick 50 and ceiling 1080, an amount of
    // 1078 is nearer 1100 than 1050, so plain snapping rounds it ABOVE the ceiling and
    // blur then rejects a value that token mode accepts. Every path that turns a raw
    // amount into a price goes through here so the two modes cannot disagree.
    const floor = priceToQ96WithDecimals({ priceRaw: 1000n, auctionTokenDecimals: AUCTION_TOKEN_DECIMALS })
    const tick = priceToQ96WithDecimals({ priceRaw: 50n, auctionTokenDecimals: AUCTION_TOKEN_DECIMALS })
    const ceiling = floor + tick + tick / 2n + tick / 5n // 1080-ish: off-grid, upper half

    const result = computeBidMaxPriceQ96({
      auctionTokenDecimals: AUCTION_TOKEN_DECIMALS,
      clearingPriceQ96: floor,
      floorPriceQ96: floor,
      tickSizeQ96: tick,
      rawAmount: 1078n,
      maxBidPriceQ96: ceiling,
    })

    // Pin the exact tick: `<= ceiling` would also pass for a clamp returning the wrong one.
    expect(result).toBe(floor + tick)
  })
})
