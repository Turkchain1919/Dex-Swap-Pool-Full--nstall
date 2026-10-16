import { describe, expect, it } from 'vitest'
import {
  shouldShowClaimOnlyTimeline,
  shouldShowNowTradingCard,
  shouldShowTradeTokenBanner,
} from '~/features/Toucan/Auction/utils/auctionDisplayVisibility'
import {
  AuctionDisplayPhase,
  AuctionDisplayResult,
  PoolAvailability,
  type AuctionDisplayState,
} from '~/features/Toucan/Auction/utils/resolveAuctionDisplayState'

function withPool(overrides: Partial<AuctionDisplayState> = {}): AuctionDisplayState {
  return {
    phase: AuctionDisplayPhase.Live,
    result: AuctionDisplayResult.Unknown,
    poolAvailability: PoolAvailability.HasPool,
    shouldShowSwap: true,
    ...overrides,
  }
}

const NOT_LIVE = Object.values(AuctionDisplayPhase).filter((phase) => phase !== AuctionDisplayPhase.Live)
const NOT_ENDED = Object.values(AuctionDisplayPhase).filter((phase) => phase !== AuctionDisplayPhase.Ended)
const NO_CONFIRMED_POOL = [PoolAvailability.Loading, PoolAvailability.Error, PoolAvailability.NoPool]

describe('shouldShowTradeTokenBanner', () => {
  it('shows for a live auction whose token has a pool', () => {
    expect(shouldShowTradeTokenBanner(withPool())).toBe(true)
  })

  it('hides while the flag is off (no display state)', () => {
    expect(shouldShowTradeTokenBanner(undefined)).toBe(false)
  })

  it.each(NOT_LIVE)('hides in phase %s', (phase) => {
    expect(shouldShowTradeTokenBanner(withPool({ phase }))).toBe(false)
  })

  it.each(NO_CONFIRMED_POOL)('hides while pool availability is %s', (poolAvailability) => {
    expect(shouldShowTradeTokenBanner(withPool({ poolAvailability }))).toBe(false)
  })
})

describe('shouldShowClaimOnlyTimeline', () => {
  const endedSuccessfully = { phase: AuctionDisplayPhase.Ended, result: AuctionDisplayResult.Successful }

  it.each(NO_CONFIRMED_POOL)('uses claim-only copy while pool availability is %s', (poolAvailability) => {
    expect(shouldShowClaimOnlyTimeline(withPool({ ...endedSuccessfully, poolAvailability }))).toBe(true)
  })

  it('uses trading copy once a pool is confirmed', () => {
    expect(shouldShowClaimOnlyTimeline(withPool(endedSuccessfully))).toBe(false)
  })

  it('preserves the legacy copy while provenance is disabled', () => {
    expect(shouldShowClaimOnlyTimeline(undefined)).toBe(false)
  })

  it.each(NOT_ENDED)('preserves the existing copy in phase %s', (phase) => {
    expect(
      shouldShowClaimOnlyTimeline(withPool({ ...endedSuccessfully, phase, poolAvailability: PoolAvailability.NoPool })),
    ).toBe(false)
  })

  it.each([AuctionDisplayResult.Unknown, AuctionDisplayResult.Failed])(
    'does not claim a successful auction while the result is %s',
    (result) => {
      expect(
        shouldShowClaimOnlyTimeline(
          withPool({ ...endedSuccessfully, result, poolAvailability: PoolAvailability.NoPool }),
        ),
      ).toBe(false)
    },
  )
})

describe('shouldShowNowTradingCard', () => {
  const endedSuccessfully = { phase: AuctionDisplayPhase.Ended, result: AuctionDisplayResult.Successful }

  it('shows for a successful ended auction whose token has a pool', () => {
    expect(shouldShowNowTradingCard({ state: withPool(endedSuccessfully), tradingRestrictedUntilTge: false })).toBe(
      true,
    )
  })

  it('hides while the flag is off (no display state)', () => {
    expect(shouldShowNowTradingCard({ state: undefined, tradingRestrictedUntilTge: false })).toBe(false)
  })

  it.each(NOT_ENDED)('hides in phase %s', (phase) => {
    expect(
      shouldShowNowTradingCard({ state: withPool({ ...endedSuccessfully, phase }), tradingRestrictedUntilTge: false }),
    ).toBe(false)
  })

  it.each([AuctionDisplayResult.Unknown, AuctionDisplayResult.Failed])(
    'hides an ended auction while the result is %s',
    (result) => {
      expect(
        shouldShowNowTradingCard({
          state: withPool({ ...endedSuccessfully, result }),
          tradingRestrictedUntilTge: false,
        }),
      ).toBe(false)
    },
  )

  it('hides while trading is restricted until the TGE', () => {
    expect(shouldShowNowTradingCard({ state: withPool(endedSuccessfully), tradingRestrictedUntilTge: true })).toBe(
      false,
    )
  })

  it.each(NO_CONFIRMED_POOL)('hides an ended auction while pool availability is %s', (poolAvailability) => {
    expect(
      shouldShowNowTradingCard({
        state: withPool({ ...endedSuccessfully, poolAvailability }),
        tradingRestrictedUntilTge: false,
      }),
    ).toBe(false)
  })
})
