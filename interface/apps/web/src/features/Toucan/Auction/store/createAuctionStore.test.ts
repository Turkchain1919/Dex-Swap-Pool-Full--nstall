import { EVMUniverseChainId } from '@universe/chains'
import { describe, expect, it } from 'vitest'
import { createAuctionStore } from '~/features/Toucan/Auction/store/createAuctionStore'
import type { AuctionDetails } from '~/features/Toucan/Auction/store/types'
import { AuctionCheckpointLoadState, AuctionOutcome } from '~/features/Toucan/Auction/store/types'

const CHAIN_ID = 1 as EVMUniverseChainId
// Address a shared link may carry in the URL: the launched token, not the auction contract
const TOKEN_ADDRESS = '0x1111111111111111111111111111111111111111'
// The auction contract's own address, as resolved by GetAuction
const AUCTION_CONTRACT_ADDRESS = '0x2222222222222222222222222222222222222222'

function makeAuctionDetails(overrides: Partial<AuctionDetails> = {}): AuctionDetails {
  return {
    auctionId: 'auction-1',
    chainId: CHAIN_ID,
    address: AUCTION_CONTRACT_ADDRESS,
    tokenAddress: TOKEN_ADDRESS,
    startBlock: '100',
    endBlock: '200',
    ...overrides,
  } as AuctionDetails
}

describe('createAuctionStore', () => {
  it('initializes auctionAddress from the URL param', () => {
    const store = createAuctionStore(TOKEN_ADDRESS, CHAIN_ID)
    expect(store.getState().auctionAddress).toBe(TOKEN_ADDRESS)
    expect(store.getState().chainId).toBe(CHAIN_ID)
  })

  describe('setAuctionDetails address canonicalization', () => {
    it('replaces a token-address URL param with the resolved auction contract address', () => {
      const store = createAuctionStore(TOKEN_ADDRESS, CHAIN_ID)

      store.getState().actions.setAuctionDetails(makeAuctionDetails())

      // Downstream consumers (checkpoint polling, VerifyWallet/KYC, bids) select
      // state.auctionAddress, so they all inherit the canonical contract address
      expect(store.getState().auctionAddress).toBe(AUCTION_CONTRACT_ADDRESS)
      expect(store.getState().auctionDetails?.address).toBe(AUCTION_CONTRACT_ADDRESS)
    })

    it('keeps the resolved address stable across polling updates', () => {
      const store = createAuctionStore(TOKEN_ADDRESS, CHAIN_ID)

      store.getState().actions.setAuctionDetails(makeAuctionDetails())
      store.getState().actions.setAuctionDetails(makeAuctionDetails())

      expect(store.getState().auctionAddress).toBe(AUCTION_CONTRACT_ADDRESS)
    })

    it('keeps the URL param until details resolve with an address', () => {
      const store = createAuctionStore(TOKEN_ADDRESS, CHAIN_ID)

      // Proto string fields default to '' — an unresolved address must not clobber the param
      store.getState().actions.setAuctionDetails(makeAuctionDetails({ address: '' }))

      expect(store.getState().auctionAddress).toBe(TOKEN_ADDRESS)
    })

    it('retains the last known address when details reset to null', () => {
      const store = createAuctionStore(TOKEN_ADDRESS, CHAIN_ID)

      store.getState().actions.setAuctionDetails(makeAuctionDetails())
      // Reset path (auction change / not found / error) clears details but not the address
      store.getState().actions.setAuctionDetails(null)

      expect(store.getState().auctionAddress).toBe(AUCTION_CONTRACT_ADDRESS)
      expect(store.getState().auctionDetails).toBeNull()
    })
  })

  // `setAuctionDetails` carries two independent additions that landed from separate PRs a few lines
  // apart: the address canonicalization above, and forwarding `checkpointLoadState` into the
  // progress recompute. Each is invisible to the other's tests, so a merge keeping only one would
  // pass CI while silently reverting the other. These two assert them together.
  describe('setAuctionDetails preserves checkpoint settledness', () => {
    it('keeps an ended auction decided across a details refresh', () => {
      const store = createAuctionStore(TOKEN_ADDRESS, CHAIN_ID)
      const { actions } = store.getState()

      // Ended, and the checkpoint settled carrying nothing — authoritative, so FAILED.
      actions.setAuctionDetails(makeAuctionDetails())
      actions.setCheckpointLoadState(AuctionCheckpointLoadState.Success)
      actions.setCurrentBlockNumberAndUpdateProgress(201)
      expect(store.getState().progress.outcome).toBe(AuctionOutcome.FAILED)

      // The details poll keeps running after the auction ends (lock/burn data updates). If this
      // recompute dropped checkpointLoadState it would default to unsettled and strand the auction
      // back on UNKNOWN — an indefinite skeleton, since checkpoint polling has already stopped.
      actions.setAuctionDetails(makeAuctionDetails())

      expect(store.getState().checkpointLoadState).toBe(AuctionCheckpointLoadState.Success)
      expect(store.getState().progress.outcome).toBe(AuctionOutcome.FAILED)
    })

    it('canonicalizes the address and keeps the outcome in the same update', () => {
      const store = createAuctionStore(TOKEN_ADDRESS, CHAIN_ID)
      const { actions } = store.getState()

      actions.setCheckpointLoadState(AuctionCheckpointLoadState.Success)
      actions.setCurrentBlockNumberAndUpdateProgress(201)
      actions.setAuctionDetails(makeAuctionDetails())

      // Both fixes, from one call: neither can be dropped without failing here.
      expect(store.getState().auctionAddress).toBe(AUCTION_CONTRACT_ADDRESS)
      expect(store.getState().progress.outcome).toBe(AuctionOutcome.FAILED)
    })
  })
})
