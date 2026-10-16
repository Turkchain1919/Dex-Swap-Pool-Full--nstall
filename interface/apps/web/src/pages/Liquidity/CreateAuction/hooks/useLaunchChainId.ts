import { UniverseChainId } from '@universe/chains'
import { useCreateAuctionStore } from '~/pages/Liquidity/CreateAuction/CreateAuctionContext'
import { TokenMode } from '~/pages/Liquidity/CreateAuction/types'

/**
 * The chain the auction is being created on — the single answer to that question, so no step can
 * hold two. It is the token form's network, not the chain captured in `configureAuction.committed`:
 * the step indicator can re-enter an earlier step and change the network without re-committing, so
 * the committed snapshot's chain goes stale while the launch chain moves.
 *
 * Falls back to Mainnet while an existing token hasn't resolved: it is the store's default network
 * for a new token, and a chain whose two raise options are different tokens, so the fallback can
 * never rewrite the raise currency before the real chain is known. The call sites used to pick
 * their own fallback — none, Mainnet, and Unichain respectively — which is what this replaces.
 */
export function useLaunchChainId(): UniverseChainId {
  return useCreateAuctionStore((state) =>
    state.tokenForm.mode === TokenMode.CREATE_NEW
      ? state.tokenForm.network
      : (state.tokenForm.existingTokenCurrencyInfo?.currency.chainId ?? UniverseChainId.Mainnet),
  )
}
