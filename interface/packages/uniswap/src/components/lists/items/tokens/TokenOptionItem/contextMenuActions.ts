import { isWebPlatform } from '@universe/environment'
import { TokenContextMenuVariant } from 'uniswap/src/components/lists/items/tokens/TokenOptionItem/types'
import { TokenContextMenuAction } from 'uniswap/src/components/lists/items/tokens/TokenOptionItemContextMenu'

export const CONTEXT_MENU_ACTIONS: Record<TokenContextMenuVariant, TokenContextMenuAction[]> = {
  [TokenContextMenuVariant.Search]: [
    TokenContextMenuAction.CopyAddress,
    ...(isWebPlatform ? [] : [TokenContextMenuAction.Favorite]),
    TokenContextMenuAction.Swap,
    TokenContextMenuAction.Send,
    TokenContextMenuAction.Receive,
    TokenContextMenuAction.Share,
  ],
  [TokenContextMenuVariant.TokenSelector]: [
    TokenContextMenuAction.CopyAddress,
    ...(isWebPlatform ? [] : [TokenContextMenuAction.Favorite]),
    TokenContextMenuAction.ViewDetails,
  ],
}
