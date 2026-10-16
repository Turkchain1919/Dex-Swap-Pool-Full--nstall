import { QueryClient, QueryObserver } from '@tanstack/react-query'
import type { ComplianceV2Client } from '@universe/compliance/src/client'
import { gatedFeaturesQueryOptions, refetchGatedFeatures } from '@universe/compliance/src/gatedFeaturesQuery'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const gatedFeatures = vi.fn()
const client = { gatedFeatures } as unknown as ComplianceV2Client

describe(gatedFeaturesQueryOptions, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not refetch a fresh cached region result by default', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const options = gatedFeaturesQueryOptions(client)
    queryClient.setQueryData(options.queryKey, [])
    const observer = new QueryObserver(queryClient, options)

    const unsubscribe = observer.subscribe(() => undefined)
    await Promise.resolve()

    expect(gatedFeatures).not.toHaveBeenCalled()
    unsubscribe()
  })
})

describe(refetchGatedFeatures, () => {
  it('refetches only active observers for the gated-features query', async () => {
    const queryClient = new QueryClient()
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue(undefined)

    await refetchGatedFeatures(queryClient)

    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: gatedFeaturesQueryOptions(client).queryKey,
      type: 'active',
    })
  })
})
