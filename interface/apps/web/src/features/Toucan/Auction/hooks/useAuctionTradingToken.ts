import { isEVMChain, type UniverseChainId, zeroAddress } from '@universe/chains'
import { useReadContract } from 'wagmi'
import { assume0xAddress } from '~/chains'
import { getAuctionRedemptionConfig, getAuctionTradingTokenOverride } from '~/features/Toucan/Config/config'

// Minimal IVirtualERC20 surface for curated redeemable auction tokens.
const virtualErc20Abi = [
  {
    type: 'function',
    name: 'UNDERLYING_TOKEN_ADDRESS',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const

/** Resolves a trading destination without changing the auction token used for bids and claims. */
export function useAuctionTradingToken({
  chainId,
  tokenAddress,
}: {
  chainId: UniverseChainId | undefined
  tokenAddress: string | undefined
}): { tradingTokenAddress: string | undefined; loading: boolean } {
  const token = chainId && tokenAddress ? { chainId, tokenAddress } : undefined
  const override = token ? getAuctionTradingTokenOverride(token) : undefined
  const isRedeemable = Boolean(token && getAuctionRedemptionConfig(token))

  const { data: underlyingAddress, isLoading } = useReadContract({
    address: assume0xAddress(tokenAddress),
    chainId: chainId && isEVMChain(chainId) ? chainId : undefined,
    abi: virtualErc20Abi,
    functionName: 'UNDERLYING_TOKEN_ADDRESS',
    // The underlying is immutable. Never call this getter on ordinary tokens or disbursement receipts.
    query: { enabled: isRedeemable && !override, staleTime: Infinity },
  })

  return {
    tradingTokenAddress:
      override ?? (isRedeemable ? (underlyingAddress === zeroAddress ? undefined : underlyingAddress) : tokenAddress),
    loading: isRedeemable && !override && isLoading,
  }
}
