import { describe, expect, it } from 'vitest'
import { AuctionOutcome } from '~/features/Toucan/Auction/store/types'
import { shouldUsePreClaimWindow } from '~/features/Toucan/Auction/utils/preClaimWindow'

describe('shouldUsePreClaimWindow', () => {
  it('is true only for a graduated auction still inside its claim window', () => {
    expect(shouldUsePreClaimWindow({ outcome: AuctionOutcome.GRADUATED, isInPreClaimWindow: true })).toBe(true)
  })

  it('is false once the claim block has arrived', () => {
    expect(shouldUsePreClaimWindow({ outcome: AuctionOutcome.GRADUATED, isInPreClaimWindow: false })).toBe(false)
  })

  // THE case round 3 flagged. `isInPreClaimWindow` is `currentBlock < claimBlock`, so it is true for
  // the entire live auction — the ended-ness carried by GRADUATED is the only thing keeping a
  // mid-auction refund off the pre-claim contract path (`exitBidPosition`). This value was `false`
  // here before this PR too: the previous expression was
  // `isAuctionEnded && isGraduated && isInPreClaimWindow`, and `isAuctionEnded` is false while live.
  it('is false during a live auction even once the graduation threshold has latched', () => {
    expect(shouldUsePreClaimWindow({ outcome: AuctionOutcome.ACTIVE, isInPreClaimWindow: true })).toBe(false)
  })

  it('is false for an auction that failed to graduate', () => {
    expect(shouldUsePreClaimWindow({ outcome: AuctionOutcome.FAILED, isInPreClaimWindow: true })).toBe(false)
  })

  it('is false while the outcome is undecided', () => {
    expect(shouldUsePreClaimWindow({ outcome: AuctionOutcome.UNKNOWN, isInPreClaimWindow: true })).toBe(false)
  })

  // Equivalence with the pre-PR expression, over the whole state space. `outcome === GRADUATED` is
  // exactly `state === ENDED && isGraduated` (computeOutcome only returns GRADUATED from its ENDED
  // branch, and only when the threshold is met), so replacing the old three-way conjunction with it
  // preserved the value in every state rather than changing behaviour.
  it('matches the pre-PR expression in every state', () => {
    const states = [
      { outcome: AuctionOutcome.UNKNOWN, isEnded: false, isGraduated: false },
      { outcome: AuctionOutcome.ACTIVE, isEnded: false, isGraduated: false },
      { outcome: AuctionOutcome.ACTIVE, isEnded: false, isGraduated: true }, // live, threshold latched
      { outcome: AuctionOutcome.FAILED, isEnded: true, isGraduated: false },
      { outcome: AuctionOutcome.GRADUATED, isEnded: true, isGraduated: true },
    ]

    for (const { outcome, isEnded, isGraduated } of states) {
      for (const isInPreClaimWindow of [true, false]) {
        const previousBehaviour = isEnded && isGraduated && isInPreClaimWindow
        expect(shouldUsePreClaimWindow({ outcome, isInPreClaimWindow })).toBe(previousBehaviour)
      }
    }
  })
})
