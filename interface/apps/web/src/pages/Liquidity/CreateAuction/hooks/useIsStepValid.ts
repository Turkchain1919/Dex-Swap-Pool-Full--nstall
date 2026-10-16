import { isValidPoolOwner } from '~/pages/Liquidity/CreateAuction/components/PoolOwnerSection'
import { useCreateAuctionStore } from '~/pages/Liquidity/CreateAuction/CreateAuctionContext'
import {
  isPostAuctionLiquidityAllocationValid,
  minimumAuctionSupplyDeposit,
} from '~/pages/Liquidity/CreateAuction/store/postAuctionLiquidityAllocationState'
import { CreateAuctionStep, PriceRangeStrategy, TokenMode } from '~/pages/Liquidity/CreateAuction/types'
import { isCustomPriceRangeAllocationValid } from '~/pages/Liquidity/CreateAuction/utils'
import { getDurationInvalidReason } from '~/pages/Liquidity/CreateAuction/utils/duration'

export function useIsStepValid(step: CreateAuctionStep): boolean {
  return useCreateAuctionStore((state) => {
    const { tokenForm, configureAuction, customizePool } = state

    switch (step) {
      case CreateAuctionStep.ADD_TOKEN_INFO:
        if (tokenForm.mode === TokenMode.CREATE_NEW) {
          return tokenForm.name.trim().length > 0 && tokenForm.symbol.trim().length > 0
        }
        return tokenForm.existingTokenCurrencyInfo !== undefined && tokenForm.totalSupply !== undefined

      case CreateAuctionStep.CONFIGURE_AUCTION: {
        const { committed, floorPrice, postAuctionLiquidityAllocation, startTime, endTime, preBidStartTime } =
          configureAuction
        if (!committed) {
          return false
        }
        const durationInvalidReason = getDurationInvalidReason({ startTime, endTime, preBidStartTime })
        // Deposit must clear the minimum where the sold/LP split keeps both legs >= 1 base unit
        // (also covers the > 0 check, since the minimum is always >= 1 base unit).
        const minDeposit = minimumAuctionSupplyDeposit(
          committed.auctionSupplyAmount.currency,
          postAuctionLiquidityAllocation,
        )
        return (
          durationInvalidReason === undefined &&
          !committed.auctionSupplyAmount.lessThan(minDeposit) &&
          !!floorPrice &&
          isPostAuctionLiquidityAllocationValid(postAuctionLiquidityAllocation)
        )
      }

      case CreateAuctionStep.CUSTOMIZE_POOL:
        if (!configureAuction.committed || !configureAuction.startTime) {
          return false
        }
        if (
          customizePool.priceRangeStrategy === PriceRangeStrategy.CUSTOM_RANGE &&
          !isCustomPriceRangeAllocationValid(customizePool.customPriceRanges)
        ) {
          return false
        }
        return isValidPoolOwner(customizePool.poolOwner)

      case CreateAuctionStep.REVIEW_LAUNCH:
        return true

      default:
        return false
    }
  })
}
