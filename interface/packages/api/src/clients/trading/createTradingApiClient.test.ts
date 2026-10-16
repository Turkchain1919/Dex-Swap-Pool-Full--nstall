import type { FetchClient } from '@universe/api/src/clients/base/types'
import { PlanStatus } from '@universe/api/src/clients/trading/__generated__'
import {
  TRADING_API_PATHS,
  V1_TRADING_API_PATHS,
  createTradingApiClient,
  getVersionedTradingApiPaths,
} from '@universe/api/src/clients/trading/createTradingApiClient'
import { describe, expect, it, vi } from 'vitest'

describe('getVersionedTradingApiPaths', () => {
  it('prefixes top-level string paths with the given prefix', () => {
    const paths = getVersionedTradingApiPaths('/v1')

    expect(paths.quote).toBe('/v1/quote')
    expect(paths.approval).toBe('/v1/check_approval')
    expect(paths.swappableTokens).toBe('/v1/swappable_tokens')
  })

  it('prefixes nested string paths recursively', () => {
    const paths = getVersionedTradingApiPaths('/v1')

    expect(paths.wallet.checkDelegation).toBe('/v1/wallet/check_delegation')
    expect(paths.wallet.encode7702).toBe('/v1/wallet/encode_7702')
    expect(paths.wallet.encode4337).toBe('/v1/wallet/encode_4337')
  })

  it('respects a custom prefix', () => {
    const paths = getVersionedTradingApiPaths('/v2')

    expect(paths.quote).toBe('/v2/quote')
    expect(paths.wallet.checkDelegation).toBe('/v2/wallet/check_delegation')
  })

  it('does not mutate the original TRADING_API_PATHS', () => {
    getVersionedTradingApiPaths('/v1')

    expect(TRADING_API_PATHS.quote).toBe('quote')
    expect(TRADING_API_PATHS.wallet.checkDelegation).toBe('wallet/check_delegation')
  })

  it('preserves the full set of keys', () => {
    const paths = getVersionedTradingApiPaths('/v1')

    expect(Object.keys(paths)).toEqual(Object.keys(TRADING_API_PATHS))
    expect(Object.keys(paths.wallet)).toEqual(Object.keys(TRADING_API_PATHS.wallet))
  })

  it('matches the exported V1_TRADING_API_PATHS', () => {
    expect(getVersionedTradingApiPaths('/v1')).toEqual(V1_TRADING_API_PATHS)
  })
})

describe('createTradingApiClient plan endpoints', () => {
  function setupClient(): { client: ReturnType<typeof createTradingApiClient>; patch: ReturnType<typeof vi.fn> } {
    const patch = vi.fn().mockResolvedValue({})
    const fetchClient = {
      context: () => ({}),
      fetch: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch,
    } as unknown as FetchClient
    const client = createTradingApiClient({
      fetchClient,
      getFeatureFlagHeaders: async () => ({}),
      getApiPathPrefix: () => '',
    })
    return { client, patch }
  }

  // Cancel has no dedicated route: it is a status-only PATCH to plan/{planId}.
  it('cancelExistingPlan PATCHes plan/:planId with a CANCELLED status body', async () => {
    const { client, patch } = setupClient()

    await client.cancelExistingPlan({ planId: 'plan-42' })

    expect(patch).toHaveBeenCalledWith(
      '/plan/plan-42',
      expect.objectContaining({ body: JSON.stringify({ status: PlanStatus.CANCELLED }) }),
    )
  })
})
