import {
  AuctionDisplayPhase,
  AuctionDisplayResult,
  PoolAvailability,
  type AuctionDisplayState,
} from '~/features/Toucan/Auction/utils/resolveAuctionDisplayState'

/** "Buy or sell {symbol}" under the bid form: only while bidding is live and the token already has a pool. */
export function shouldShowTradeTokenBanner(state: AuctionDisplayState | undefined): boolean {
  return state?.phase === AuctionDisplayPhase.Live && state.poolAvailability === PoolAvailability.HasPool
}

/** A successful ended auction's timeline only promises trading once its pool is confirmed. */
export function shouldShowClaimOnlyTimeline(state: AuctionDisplayState | undefined): boolean {
  return (
    state?.phase === AuctionDisplayPhase.Ended &&
    state.result === AuctionDisplayResult.Successful &&
    state.poolAvailability !== PoolAvailability.HasPool
  )
}

/** Now-trading card in place of the bid form: once a successful auction has ended and the token has a pool, unless trading waits on a TGE. */
export function shouldShowNowTradingCard({
  state,
  tradingRestrictedUntilTge,
}: {
  state: AuctionDisplayState | undefined
  tradingRestrictedUntilTge: boolean
}): boolean {
  return (
    state?.phase === AuctionDisplayPhase.Ended &&
    state.result === AuctionDisplayResult.Successful &&
    state.poolAvailability === PoolAvailability.HasPool &&
    !tradingRestrictedUntilTge
  )
}
