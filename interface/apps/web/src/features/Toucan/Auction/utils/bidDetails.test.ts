import { describe, expect, it } from 'vitest'
import { AuctionBidStatus, AuctionOutcome } from '~/features/Toucan/Auction/store/types'
import { getBidDisplayInfo } from '~/features/Toucan/Auction/utils/bidDetails'

function displayInfo({
  outcome,
  isAuctionInProgress = false,
  bidStatus = AuctionBidStatus.Submitted,
  isInRange = true,
  isFullyFilled = false,
  isInPreClaimWindow = false,
}: {
  outcome: AuctionOutcome
  isAuctionInProgress?: boolean
  bidStatus?: AuctionBidStatus
  isInRange?: boolean
  isFullyFilled?: boolean
  isInPreClaimWindow?: boolean
}) {
  return getBidDisplayInfo({
    bidStatus,
    isInRange,
    isFullyFilled,
    isAuctionInProgress,
    outcome,
    isInPreClaimWindow,
  })
}

describe('getBidDisplayInfo', () => {
  describe('auction genuinely failed to graduate', () => {
    it('offers the full refund state for an unresolved bid', () => {
      const { displayState, descriptionState } = displayInfo({ outcome: AuctionOutcome.FAILED })

      expect(displayState).toBe('fundsAvailable')
      expect(descriptionState).toBe('overNotGraduated')
    })

    it('reports an already-exited bid as withdrawn', () => {
      const { displayState, descriptionState } = displayInfo({
        outcome: AuctionOutcome.FAILED,
        bidStatus: AuctionBidStatus.Exited,
      })

      expect(displayState).toBe('withdrawn')
      expect(descriptionState).toBe('overNotGraduatedExited')
    })
  })

  describe('auction graduated', () => {
    it('does not claim funds are available', () => {
      const { displayState, descriptionState } = displayInfo({
        outcome: AuctionOutcome.GRADUATED,
        isFullyFilled: true,
      })

      expect(displayState).toBe('complete')
      expect(descriptionState).toBe('completeOver')
    })

    it('uses pre-claim copy inside the pre-claim window', () => {
      const { descriptionState } = displayInfo({
        outcome: AuctionOutcome.GRADUATED,
        isFullyFilled: true,
        isInPreClaimWindow: true,
      })

      expect(descriptionState).toBe('completePreClaim')
    })

    it('reports a claimed bid as withdrawn', () => {
      const { displayState, descriptionState } = displayInfo({
        outcome: AuctionOutcome.GRADUATED,
        bidStatus: AuctionBidStatus.Claimed,
        isFullyFilled: true,
      })

      expect(displayState).toBe('withdrawn')
      expect(descriptionState).toBe('completeClaimed')
    })
  })

  describe('outcome still undecided', () => {
    // The bug this guards: UNKNOWN used to reach the code via `isGraduated === false`, so a bidder
    // on an auction that DID graduate was told their whole budget was refundable.
    it('asserts neither outcome for a bid on an auction whose result is not known yet', () => {
      const { displayState, descriptionState } = displayInfo({
        outcome: AuctionOutcome.UNKNOWN,
      })

      expect(displayState).toBe('pending')
      expect(descriptionState).toBe('awaitingOutcome')
    })

    it('stays undecided even when the bid looks fully filled', () => {
      const { displayState, descriptionState } = displayInfo({
        outcome: AuctionOutcome.UNKNOWN,
        isFullyFilled: true,
      })

      expect(displayState).toBe('pending')
      expect(descriptionState).toBe('awaitingOutcome')
    })
  })

  describe('auction still running', () => {
    it('never shows the failed-auction refund state before the auction ends', () => {
      const { displayState, descriptionState, isAuctionEnded } = displayInfo({
        outcome: AuctionOutcome.ACTIVE,
        isAuctionInProgress: true,
        isInRange: false,
      })

      expect(displayState).toBe('outOfRange')
      expect(descriptionState).toBe('outOfRangeInProgress')
      expect(isAuctionEnded).toBe(false)
    })
  })
})
