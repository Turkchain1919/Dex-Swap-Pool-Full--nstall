import { renderHook } from '@testing-library/react'
import { usePortfolioChartDetailsHeartbeatCoordinator } from 'src/screens/PortfolioChartDetailsScreen/usePortfolioChartDetailsHeartbeatCoordinator'
import { useHeartbeatCoordinator } from 'src/utils/useHeartbeatCoordinator'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

const mockQueryClientRefetchQueries = vi.fn().mockResolvedValue(undefined)

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ refetchQueries: mockQueryClientRefetchQueries }),
}))

vi.mock('src/utils/useHeartbeatCoordinator', () => ({
  useHeartbeatCoordinator: vi.fn(),
}))

const mockUseHeartbeatCoordinator = vi.mocked(useHeartbeatCoordinator)

describe('usePortfolioChartDetailsHeartbeatCoordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryClientRefetchQueries.mockReset().mockResolvedValue(undefined)
  })

  it('passes only a full refresh to the shared coordinator — no 30s price tick', () => {
    renderHook(() => usePortfolioChartDetailsHeartbeatCoordinator())

    expect(mockUseHeartbeatCoordinator).toHaveBeenCalledWith({ refresh: expect.any(Function) })
  })

  it('refetches wallet balances and PnL, but not the value chart, on refresh', async () => {
    renderHook(() => usePortfolioChartDetailsHeartbeatCoordinator())

    const { refresh } = mockUseHeartbeatCoordinator.mock.calls[0]![0]
    await refresh()

    expect(mockQueryClientRefetchQueries).toHaveBeenCalledTimes(2)
    expect(mockQueryClientRefetchQueries).toHaveBeenCalledWith({
      queryKey: [ReactQueryCacheKey.GetWalletBalances],
      type: 'active',
    })
    expect(mockQueryClientRefetchQueries).toHaveBeenCalledWith({
      queryKey: [ReactQueryCacheKey.GetWalletProfitLoss],
      type: 'active',
    })
  })
})
