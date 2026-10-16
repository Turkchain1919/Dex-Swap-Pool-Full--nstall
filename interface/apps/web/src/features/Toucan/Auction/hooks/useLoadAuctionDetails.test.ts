import { UniverseChainId } from '@universe/chains'
import { createElement } from 'react'
import { logger } from 'utilities/src/logger/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLoadAuctionDetails } from '~/features/Toucan/Auction/hooks/useLoadAuctionDetails'
import { AuctionStoreContext } from '~/features/Toucan/Auction/store/AuctionStoreContext'
import { createAuctionStore } from '~/features/Toucan/Auction/store/createAuctionStore'
import { AuctionDetailsLoadState } from '~/features/Toucan/Auction/store/types'
import { resetAuctionDetailsLogGuards } from '~/features/Toucan/Auction/utils/auctionDetailsLogGuards'
import { render } from '~/test-utils/render'

const AUCTION_ADDRESS = '0x9D908e12c463e6ae0f074bF3Af56DedeD0cA1949'

const mockUseQuery = vi.fn()

vi.mock('@tanstack/react-query', async () => ({
  ...(await vi.importActual('@tanstack/react-query')),
  useQuery: () => mockUseQuery(),
}))

vi.mock('utilities/src/logger/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

// Token enrichment is a separate concern and hits its own queries; stubbed so this suite is only
// about the auction-details load lifecycle.
vi.mock('~/features/Toucan/Auction/hooks/useAuctionTokenInfo', () => ({
  useAuctionTokenInfo: () => ({ tokenInfo: undefined, loading: false }),
}))

/**
 * A react-query result in one of its settled/unsettled shapes. `errorUpdateCount` counts *settled*
 * error fetches (retries exhausted), which is what the failure log gates on — see the hook.
 */
function queryResult({
  data,
  error,
  isLoading = false,
  errorUpdateCount = 0,
}: {
  data?: unknown
  error?: Error
  isLoading?: boolean
  errorUpdateCount?: number
}) {
  return { data, error, isLoading, errorUpdateCount }
}

/** A failure that has already outlived a full retry cycle and a later poll — i.e. terminal. */
function persistentFailure(message: string) {
  return queryResult({ error: new Error(message), errorUpdateCount: 2 })
}

/** A GetAuction response carrying one auction row. */
function auctionResponse(auctionOverrides: Record<string, unknown> = {}) {
  return queryResult({
    data: {
      auctions: [
        {
          auctionId: 'auction-1',
          address: AUCTION_ADDRESS,
          startBlock: '100',
          endBlock: '200',
          ...auctionOverrides,
        },
      ],
    },
  })
}

function load({ address = AUCTION_ADDRESS }: { address?: string } = {}) {
  const store = createAuctionStore(AUCTION_ADDRESS, UniverseChainId.Mainnet)

  function Probe(): null {
    useLoadAuctionDetails(UniverseChainId.Mainnet, address)
    return null
  }

  render(createElement(AuctionStoreContext.Provider, { value: store }, createElement(Probe)))

  return { store }
}

describe('useLoadAuctionDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAuctionDetailsLogGuards()
    mockUseQuery.mockReturnValue(queryResult({ isLoading: true }))
  })

  describe('auction-details failure logging', () => {
    it('logs a failed GetAuction so the root stall is not silent', () => {
      // The stall this closes: without auction details there are no start/end blocks, so the
      // progress state cannot reach ENDED, the outcome stays UNKNOWN, the banner holds its skeleton,
      // and the checkpoint diagnostics stay silent by design. Nothing reported it before.
      mockUseQuery.mockReturnValue(persistentFailure('unavailable: upstream timeout'))
      const { store } = load()

      expect(store.getState().auctionDetailsLoadState).toBe(AuctionDetailsLoadState.Error)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith(expect.any(Error), {
        tags: { file: 'useLoadAuctionDetails.ts', function: 'useLoadAuctionDetails' },
        extra: {
          chainId: UniverseChainId.Mainnet,
          auctionAddress: AUCTION_ADDRESS,
          error: 'unavailable: upstream timeout',
        },
      })
      // Stable message — Datadog error tracking counts occurrences of this exact string, and it has
      // to stay distinguishable from the two checkpoint signals.
      const loggedError = vi.mocked(logger.error).mock.calls[0]?.[0] as Error
      expect(loggedError.message).toBe('Failed to load auction details')
    })

    it('carries the underlying query error on `cause` so its stack survives the rewrap', () => {
      const queryError = new Error('unavailable: upstream timeout')
      mockUseQuery.mockReturnValue(queryResult({ error: queryError, errorUpdateCount: 2 }))
      load()

      const loggedError = vi.mocked(logger.error).mock.calls[0]?.[0] as Error
      expect(loggedError.cause).toBe(queryError)
    })

    it('logs at most once per auction, since the hook re-renders on every poll', () => {
      mockUseQuery.mockReturnValue(persistentFailure('boom'))
      load()
      load()
      load()

      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('stays quiet when a failed poll still left stale auction data in hand', () => {
      // react-query retains the last successful `data`, so a transient poll failure arrives with the
      // previous auction row still present. The page is not broken and the UI deliberately does not
      // flash an error state, so reporting it would be a false diagnostic that also burns the key.
      mockUseQuery.mockReturnValue({ ...auctionResponse(), error: new Error('503') })
      const { store } = load()

      expect(store.getState().auctionDetailsLoadState).not.toBe(AuctionDetailsLoadState.Error)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('does not report a first settled failure, which a later poll may still recover from', () => {
      // "No data in hand" is not terminal: on first mount there has never been a success to retain,
      // so one exhausted retry cycle reaches here. Reporting it would spend the once-per-session key
      // on a blip and silence the permanent failure it exists to catch.
      mockUseQuery.mockReturnValue(queryResult({ error: new Error('transient 503'), errorUpdateCount: 1 }))
      const { store } = load()

      // The user-visible error state still fires immediately — only the log waits.
      expect(store.getState().auctionDetailsLoadState).toBe(AuctionDetailsLoadState.Error)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('still reports once the failure outlives a later poll, key unspent by the first', () => {
      mockUseQuery.mockReturnValue(queryResult({ error: new Error('transient 503'), errorUpdateCount: 1 }))
      load()
      expect(logger.error).not.toHaveBeenCalled()

      mockUseQuery.mockReturnValue(queryResult({ error: new Error('still down'), errorUpdateCount: 2 }))
      load()

      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('stays quiet on a successful load', () => {
      mockUseQuery.mockReturnValue(auctionResponse())
      load()

      expect(logger.error).not.toHaveBeenCalled()
    })

    it('stays quiet while the request is still in flight', () => {
      mockUseQuery.mockReturnValue(queryResult({ isLoading: true }))
      load()

      expect(logger.error).not.toHaveBeenCalled()
    })

    it('stays quiet when there is no address to request against', () => {
      mockUseQuery.mockReturnValue(persistentFailure('boom'))
      load({ address: '' })

      expect(logger.error).not.toHaveBeenCalled()
    })
  })
  // `tokenTotalSupply` is the token's whole supply; `totalSupply` is only the slice deposited into the
  // auction contract. They match on a new-token launch, so substituting one for the other passes
  // unnoticed there while understating every FDV surface on an existing-token auction by the
  // full-supply/auctioned-slice ratio.
  describe('token total supply', () => {
    it('leaves an absent tokenTotalSupply absent instead of standing the auctioned slice in for it', () => {
      mockUseQuery.mockReturnValue(
        auctionResponse({ tokenTotalSupply: undefined, totalSupply: '1000000000000000000000' }),
      )
      const { store } = load()

      const details = store.getState().auctionDetails
      expect(details).not.toBeNull()
      expect(details?.tokenTotalSupply).toBeUndefined()
      expect(details?.totalSupply).toBe('1000000000000000000000')
    })

    it('reports the gap so we can tell transient RPC failures from structurally-null tokens', () => {
      mockUseQuery.mockReturnValue(
        auctionResponse({
          tokenTotalSupply: undefined,
          totalSupply: '1000000000000000000000',
          tokenAddress: '0x2222222222222222222222222222222222222222',
        }),
      )
      load()

      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(logger.warn).toHaveBeenCalledWith(
        'useLoadAuctionDetails.ts',
        'useLoadAuctionDetails',
        'Auction is missing tokenTotalSupply',
        {
          chainId: UniverseChainId.Mainnet,
          auctionAddress: AUCTION_ADDRESS,
          tokenAddress: '0x2222222222222222222222222222222222222222',
          tokenTotalSupply: undefined,
        },
      )
    })

    it('reports the gap at most once per auction, since the hook re-renders on every poll', () => {
      mockUseQuery.mockReturnValue(auctionResponse({ tokenTotalSupply: undefined }))
      load()
      load()
      load()

      expect(logger.warn).toHaveBeenCalledTimes(1)
    })

    it('treats a zero supply as absent — a zero valuation is unrenderable, not zero', () => {
      mockUseQuery.mockReturnValue(auctionResponse({ tokenTotalSupply: '0' }))
      load()

      expect(logger.warn).toHaveBeenCalledTimes(1)
    })

    it('keeps a reported supply and stays quiet', () => {
      mockUseQuery.mockReturnValue(
        auctionResponse({ tokenTotalSupply: '5000000000000000000000', totalSupply: '1000000000000000000000' }),
      )
      const { store } = load()

      expect(store.getState().auctionDetails?.tokenTotalSupply).toBe('5000000000000000000000')
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })
})
