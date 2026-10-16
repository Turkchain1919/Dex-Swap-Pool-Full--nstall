import { getValidAddress, isEVMChain } from '@universe/chains'
import { isUniverseChainId } from 'uniswap/src/features/chains/utils'
import { isAddress } from '~/chains'
import { getChainUrlParam } from '~/utils/params/chainParams'

export function getAuctionDetailsURL({
  chainId,
  auctionAddress,
}: {
  chainId: number
  auctionAddress: string
}): string | undefined {
  if (!isUniverseChainId(chainId) || !isEVMChain(chainId)) {
    return undefined
  }

  const address = getValidAddress({ address: auctionAddress, chainId })
  if (!address || !isAddress(address)) {
    return undefined
  }

  return `/explore/auctions/${getChainUrlParam(chainId)}/${address}`
}
