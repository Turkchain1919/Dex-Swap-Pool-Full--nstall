import { EVMUniverseChainId } from '@universe/chains'
import { useMemo } from 'react'
import { useAuctionTradingToken } from '~/features/Toucan/Auction/hooks/useAuctionTradingToken'
import { useAuctionStore } from '~/features/Toucan/Auction/store/useAuctionStore'
import { getAuctionRedemptionConfig } from '~/features/Toucan/Config/config'

export interface AuctionRedemption {
  /** Whether the auctioned token is a virtual token now redeemable for a real, tradeable one. */
  isRedeemable: boolean
  /** External page to redeem on. Defined whenever `isRedeemable` is true. */
  redeemUrl: string | undefined
  /**
   * Real (underlying) token address, read on-chain. Undefined while the read is in flight, but
   * also — with `loading` already false — when the read failed or returned the zero address.
   * Gate on this being set, not on `loading`.
   */
  realTokenAddress: string | undefined
  /** Chain of the auction — and of the real token (the on-chain underlying). */
  chainId: EVMUniverseChainId | undefined
  /** True while the on-chain underlying-token read is in flight. */
  loading: boolean
}

/**
 * Resolves whether the current auction's (virtual) token is redeemable for a real token, plus
 * where to redeem and which real token to point at.
 *
 * Today the "is redeemable" flag and redeem URL come from a local config override
 * (`getAuctionRedemptionConfig`), and the real token address is read on-chain from the virtual
 * token's `UNDERLYING_TOKEN_ADDRESS()`. This hook is the single seam for that: when the backend
 * starts serving redemption state on the `Auction` type, only this hook changes — the banner and
 * graduated card keep consuming the same shape.
 */
export function useAuctionRedemption(): AuctionRedemption {
  const auctionDetails = useAuctionStore((state) => state.auctionDetails)
  const chainId = auctionDetails?.chainId
  const virtualTokenAddress = auctionDetails?.tokenAddress

  const config = useMemo(
    () =>
      chainId && virtualTokenAddress
        ? getAuctionRedemptionConfig({ chainId, tokenAddress: virtualTokenAddress })
        : undefined,
    [chainId, virtualTokenAddress],
  )
  const isRedeemable = Boolean(config)

  const { tradingTokenAddress, loading } = useAuctionTradingToken({
    tokenAddress: virtualTokenAddress,
    chainId,
  })

  return useMemo(
    () => ({
      isRedeemable,
      redeemUrl: config?.redeemUrl,
      realTokenAddress: isRedeemable ? tradingTokenAddress : undefined,
      chainId,
      loading,
    }),
    [isRedeemable, config?.redeemUrl, tradingTokenAddress, chainId, loading],
  )
}
