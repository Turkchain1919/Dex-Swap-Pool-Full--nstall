import { EVMUniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBidsListData } from '~/features/Toucan/Auction/hooks/useBidsListData'
import { useDurationRemaining } from '~/features/Toucan/Auction/hooks/useDurationRemaining'
import { AuctionBidStatus, AuctionOutcome } from '~/features/Toucan/Auction/store/types'
import { useAuctionStore } from '~/features/Toucan/Auction/store/useAuctionStore'

export function useWithdrawButtonState({
  outcome,
  claimBlock,
  currentBlockNumber,
  chainId,
}: {
  /**
   * Tri-state outcome, not a boolean: only GRADUATED and FAILED may drive copy about the bidder's
   * funds. UNKNOWN and ACTIVE leave the button disabled with a neutral label.
   */
  outcome: AuctionOutcome
  claimBlock?: string
  currentBlockNumber?: number
  chainId?: EVMUniverseChainId
}): {
  label: string
  isDisabled: boolean
  disabledTooltip: string | undefined
  allBidsExited: boolean
} {
  const { t } = useTranslation()
  const isGraduated = outcome === AuctionOutcome.GRADUATED
  // "Withdraw tokens" and "Withdraw funds" are both claims about the bidder's money. Neither is
  // safe until the auction has actually settled one way or the other.
  const isOutcomeSettled = isGraduated || outcome === AuctionOutcome.FAILED
  const { bidItems, hasErrors } = useBidsListData()
  const pendingWithdrawalBidIds = useAuctionStore((state) => state.pendingWithdrawalBidIds)
  const awaitingConfirmationBidIds = useAuctionStore((state) => state.awaitingConfirmationBidIds)

  // Calculate duration remaining until claim block
  const durationRemaining = useDurationRemaining(chainId, claimBlock ? Number(claimBlock) : undefined)

  // Check if we're in the withdrawal waiting period (auction ended but claim not yet available)
  const isClaimPeriodNotOpen = useMemo(() => {
    if (!claimBlock || !currentBlockNumber) {
      return false
    }
    return currentBlockNumber < Number(claimBlock)
  }, [claimBlock, currentBlockNumber])

  // Check if ANY withdrawal is in progress (for the main withdraw button)
  const isWithdrawalPending = pendingWithdrawalBidIds.size > 0
  const isAwaitingWithdrawalConfirmation = awaitingConfirmationBidIds.size > 0

  const hasAuctionTokensToClaim = useMemo(
    () =>
      isGraduated && bidItems.some((item) => item.bid.status !== AuctionBidStatus.Claimed && item.bid.amount !== '0'),
    [bidItems, isGraduated],
  )

  // Check if all bids have been exited (for failed auctions)
  const allBidsExited = useMemo(
    () => bidItems.length > 0 && bidItems.every((item) => item.bid.status === AuctionBidStatus.Exited),
    [bidItems],
  )

  // Check if all bids have been claimed (for graduated auctions)
  // Treat exited bids with 0 token amount as resolved (nothing to claim).
  const allBidsClaimed = useMemo(
    () =>
      bidItems.length > 0 &&
      bidItems.every(
        (item) =>
          item.bid.status === AuctionBidStatus.Claimed ||
          (item.bid.status === AuctionBidStatus.Exited && item.bid.amount === '0'),
      ),
    [bidItems],
  )

  const label = useMemo(() => {
    if (!isOutcomeSettled) {
      return t('common.loading')
    }
    // Check claim period first (only for graduated auctions)
    if (isGraduated && isClaimPeriodNotOpen && durationRemaining) {
      return t('toucan.auction.withdrawAvailableIn', {
        time: durationRemaining,
      })
    }
    if (isWithdrawalPending || isAwaitingWithdrawalConfirmation) {
      return hasAuctionTokensToClaim
        ? t('toucan.auction.withdrawTokens.withdrawingTokens')
        : t('toucan.auction.withdrawTokens.withdrawingFunds')
    }
    if (isGraduated) {
      if (allBidsClaimed) {
        return t('toucan.auction.withdrawTokens.tokensWithdrawn')
      }
      return t('toucan.auction.withdrawTokens')
    }

    // Failed auction - funds withdrawal
    if (allBidsExited) {
      return t('toucan.auction.withdrawTokens.fundsWithdrawn')
    }
    return t('toucan.auction.withdrawFunds')
  }, [
    allBidsClaimed,
    allBidsExited,
    durationRemaining,
    hasAuctionTokensToClaim,
    isAwaitingWithdrawalConfirmation,
    isClaimPeriodNotOpen,
    isGraduated,
    isOutcomeSettled,
    isWithdrawalPending,
    t,
  ])

  const isDisabled = useMemo(() => {
    if (!isOutcomeSettled) {
      return true
    }
    // Check claim period first (only for graduated auctions)
    if (isGraduated && isClaimPeriodNotOpen) {
      return true
    }
    if (hasErrors && bidItems.length === 0) {
      return true
    }
    if (isWithdrawalPending || isAwaitingWithdrawalConfirmation) {
      return true
    }

    if (isGraduated) {
      return allBidsClaimed
    }

    // Failed auction - disable if all funds already withdrawn
    return allBidsExited
  }, [
    allBidsClaimed,
    allBidsExited,
    bidItems.length,
    hasErrors,
    isAwaitingWithdrawalConfirmation,
    isClaimPeriodNotOpen,
    isGraduated,
    isOutcomeSettled,
    isWithdrawalPending,
  ])

  const disabledTooltip = useMemo(() => {
    if (hasErrors && bidItems.length === 0) {
      return t('common.error.general')
    }
    return undefined
  }, [hasErrors, bidItems.length, t])

  return { label, isDisabled, disabledTooltip, allBidsExited }
}
