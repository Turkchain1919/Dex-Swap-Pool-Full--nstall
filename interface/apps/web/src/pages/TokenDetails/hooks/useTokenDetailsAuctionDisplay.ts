import { useContext } from 'react'
import { TokenDetailsAuctionDisplayContext } from '~/pages/TokenDetails/context/TokenDetailsAuctionDisplayProvider'
import type { TokenDetailsAuctionDisplay } from '~/pages/TokenDetails/utils/tokenDetailsAuctionDisplay'

export interface TokenDetailsAuctionDisplayModel extends TokenDetailsAuctionDisplay {
  isInitialLoading: boolean
  /** Re-reads the chain head so the phase flips from blocks, never from the browser clock. */
  refetchCurrentBlock: () => void
}

export function useTokenDetailsAuctionDisplay(): TokenDetailsAuctionDisplayModel {
  const display = useContext(TokenDetailsAuctionDisplayContext)
  if (!display) {
    throw new Error('useTokenDetailsAuctionDisplay requires TokenDetailsAuctionDisplayProvider')
  }
  return display
}
