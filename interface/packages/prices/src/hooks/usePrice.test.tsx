// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { PriceServiceProvider } from '@universe/prices/src/context/PriceServiceContext'
import { usePrice } from '@universe/prices/src/hooks/usePrice'
import { priceKeys } from '@universe/prices/src/queries/priceKeys'
import type { RestPriceBatcher } from '@universe/prices/src/sources/rest/RestPriceBatcher'
import type { TokenPriceData, TokenPriceMessage, TokenSubscriptionParams } from '@universe/prices/src/types'
import type { WebSocketClient } from '@universe/websocket'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const CHAIN_ID = 1
const ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

function createMockWsClient(): WebSocketClient<TokenSubscriptionParams, TokenPriceMessage['data']> {
  return {
    isConnected: vi.fn(() => false),
    getConnectionStatus: vi.fn(() => 'disconnected' as const),
    getConnectionId: vi.fn(() => null),
    subscribe: vi.fn(() => vi.fn()),
    onStatusChange: vi.fn(() => vi.fn()),
    onConnectionEstablished: vi.fn(() => vi.fn()),
  }
}

function renderUsePrice(
  options: { chainId: number | undefined; address: string | undefined },
  { restBatcher, seed }: { restBatcher?: RestPriceBatcher; seed?: TokenPriceData | null } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // Seed before mount to model a rehydrated (persisted) cache entry.
  if (seed !== undefined) {
    queryClient.setQueryData(priceKeys.token(CHAIN_ID, ADDRESS), seed)
  }
  const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
    <QueryClientProvider client={queryClient}>
      <PriceServiceProvider wsClient={createMockWsClient()} queryClient={queryClient} restBatcher={restBatcher}>
        {children}
      </PriceServiceProvider>
    </QueryClientProvider>
  )
  const { result } = renderHook(() => usePrice(options), { wrapper })
  return { result, queryClient }
}

/** A batcher whose fetch never settles — models a refetch round-trip still in flight. */
function createHangingRestBatcher(): RestPriceBatcher {
  return { fetch: vi.fn(() => new Promise<never>(() => {})) } as unknown as RestPriceBatcher
}

describe('usePrice', () => {
  it('reports isLoading while no price has arrived yet', () => {
    const { result } = renderUsePrice({ chainId: CHAIN_ID, address: ADDRESS })

    expect(result.current.price).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
  })

  it('clears isLoading once a price lands in the cache', async () => {
    const { result, queryClient } = renderUsePrice({ chainId: CHAIN_ID, address: ADDRESS })

    const data: TokenPriceData = { price: 2500, timestamp: Date.now(), source: 'aurora_ws' }
    queryClient.setQueryData(priceKeys.token(CHAIN_ID, ADDRESS), data)

    await waitFor(() => {
      expect(result.current.price).toBe(2500)
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('is not loading when disabled (missing chainId/address)', () => {
    const { result } = renderUsePrice({ chainId: undefined, address: undefined })

    expect(result.current.price).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('withholds a cached price older than the display cap', async () => {
    const { result, queryClient } = renderUsePrice({ chainId: CHAIN_ID, address: ADDRESS })

    const dayOld: TokenPriceData = { price: 2500, timestamp: Date.now() - 24 * 60 * 60 * 1000, source: 'aurora_ws' }
    queryClient.setQueryData(priceKeys.token(CHAIN_ID, ADDRESS), dayOld)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.price).toBeUndefined()
  })

  it('returns a cached price younger than the display cap', async () => {
    const { result, queryClient } = renderUsePrice({ chainId: CHAIN_ID, address: ADDRESS })

    const recent: TokenPriceData = { price: 2500, timestamp: Date.now() - 5 * 60 * 1000, source: 'aurora_ws' }
    queryClient.setQueryData(priceKeys.token(CHAIN_ID, ADDRESS), recent)

    await waitFor(() => {
      expect(result.current.price).toBe(2500)
    })
  })

  describe('isStaleRefreshing', () => {
    const DAY_OLD: TokenPriceData = { price: 2500, timestamp: Date.now() - 24 * 60 * 60 * 1000, source: 'aurora_ws' }

    it('reports a withheld stale entry as refreshing while its mount refetch is in flight', async () => {
      // A returning user: the persisted entry rehydrates too old to display, and
      // refetchOnMount fires over it. The undefined price is provisional, not settled.
      const { result } = renderUsePrice(
        { chainId: CHAIN_ID, address: ADDRESS },
        { restBatcher: createHangingRestBatcher(), seed: DAY_OLD },
      )

      await waitFor(() => {
        expect(result.current.isStaleRefreshing).toBe(true)
      })
      expect(result.current.price).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })

    it('does not report a withheld stale entry as refreshing when no fetch is in flight', async () => {
      // No restBatcher: nothing can refetch, so the missing price is as settled as it gets.
      const { result } = renderUsePrice({ chainId: CHAIN_ID, address: ADDRESS }, { seed: DAY_OLD })

      await waitFor(() => {
        expect(result.current.price).toBeUndefined()
      })
      expect(result.current.isStaleRefreshing).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('does not report a settled-missing entry (cached null) as refreshing during a re-poll', async () => {
      // A token with no known price: background polls over the null entry must not flap
      // consumers between "missing" and "pending" on every tick.
      const { result } = renderUsePrice(
        { chainId: CHAIN_ID, address: ADDRESS },
        { restBatcher: createHangingRestBatcher(), seed: null },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.price).toBeUndefined()
      expect(result.current.isStaleRefreshing).toBe(false)
    })

    it('stops reporting refreshing once the refetch lands a fresh price', async () => {
      const fresh: TokenPriceData = { price: 3000, timestamp: Date.now(), source: 'aurora_rest_fallback' }
      const restBatcher = { fetch: vi.fn(() => Promise.resolve(fresh)) } as unknown as RestPriceBatcher
      const { result } = renderUsePrice({ chainId: CHAIN_ID, address: ADDRESS }, { restBatcher, seed: DAY_OLD })

      await waitFor(() => {
        expect(result.current.price).toBe(3000)
      })
      expect(result.current.isStaleRefreshing).toBe(false)
    })
  })
})
