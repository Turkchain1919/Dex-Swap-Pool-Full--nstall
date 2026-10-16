import { UniverseChainId } from '@universe/chains'

export type NFTItem = {
  chainId?: UniverseChainId
  contractAddress?: string
  tokenId?: string
  name?: string
  description?: string
  imageUrl?: string
  imageDimensions?: { width: number; height: number }
  thumbnailUrl?: string
  collectionName?: string
  isSpam?: boolean
}
