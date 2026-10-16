import { SpamCode as RestSpamCode, TokenType } from '@uniswap/client-data-api/dist/data/v1/types_pb'
import { AssetType } from 'uniswap/src/entities/assets'

/**
 * Maps token type to asset type for the transaction
 */
export function mapTokenTypeToAssetType(tokenType?: TokenType): AssetType {
  switch (tokenType) {
    case TokenType.ERC721:
      return AssetType.ERC721
    case TokenType.ERC1155:
      return AssetType.ERC1155
    case TokenType.NATIVE:
    case TokenType.ERC20:
    default:
      return AssetType.Currency
  }
}

export enum AssetCase {
  Nft = 'nft',
  Token = 'token',
}

/**
 * Determines if a token is spam based on REST API spam codes
 */
export function isRestTokenSpam(spamCode?: RestSpamCode): boolean {
  return spamCode === RestSpamCode.SPAM || spamCode === RestSpamCode.SPAM_URL
}
