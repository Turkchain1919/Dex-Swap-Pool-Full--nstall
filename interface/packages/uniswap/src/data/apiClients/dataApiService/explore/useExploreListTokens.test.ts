import { waitFor } from '@testing-library/react-native'
import { HistoryDuration, TokensOrderBy } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { useExploreListTokens } from 'uniswap/src/data/apiClients/dataApiService/explore/useExploreListTokens'
import { renderHookWithProviders } from 'uniswap/src/test/render'

const { mockListTokens } = vi.hoisted(() => ({ mockListTokens: vi.fn() }))

vi.mock('uniswap/src/data/apiClients/dataApiService/clients/DataApiClientV2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('uniswap/src/data/apiClients/dataApiService/clients/DataApiClientV2')>()),
  dataApiServiceClientV2: { listTokens: mockListTokens },
}))

const BASE_PARAMS = {
  chainIds: [1, 8453],
  orderBy: TokensOrderBy.VOLUME_1D,
  ascending: false,
  pageSize: 3,
}

describe(useExploreListTokens, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListTokens.mockResolvedValue({ multichainTokens: [] })
  })

  it('sends the category filter when a categoryId is given', async () => {
    renderHookWithProviders(() => useExploreListTokens({ ...BASE_PARAMS, categoryId: 'trending' }))

    await waitFor(() => expect(mockListTokens).toHaveBeenCalledTimes(1))
    expect(mockListTokens).toHaveBeenCalledWith({
      chainIds: [1, 8453],
      page: { pageSize: 3, pageToken: '' },
      sort: { orderBy: TokensOrderBy.VOLUME_1D, ascending: false },
      sparklineDuration: HistoryDuration.DAY,
      filter: { categoryIds: ['trending'] },
    })
  })

  it('omits the filter entirely without a categoryId', async () => {
    renderHookWithProviders(() => useExploreListTokens(BASE_PARAMS))

    await waitFor(() => expect(mockListTokens).toHaveBeenCalledTimes(1))
    expect(mockListTokens.mock.calls[0]?.[0]).not.toHaveProperty('filter')
  })

  it('does not fetch while disabled', () => {
    renderHookWithProviders(() => useExploreListTokens({ ...BASE_PARAMS, categoryId: 'trending', enabled: false }))

    expect(mockListTokens).not.toHaveBeenCalled()
  })
})
