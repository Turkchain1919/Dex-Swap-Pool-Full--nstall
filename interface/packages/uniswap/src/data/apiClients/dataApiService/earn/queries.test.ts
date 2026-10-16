import { type PlainMessage, toPlainMessage } from '@bufbuild/protobuf'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { GetEarnPositionResponse } from '@uniswap/client-data-api/dist/data/v2/api_pb'
import { dataApiServiceClientV2 } from 'uniswap/src/data/apiClients/dataApiService/clients/DataApiClientV2'
import { getEarnPositionQueryOptions } from 'uniswap/src/data/apiClients/dataApiService/earn/queries'

vi.mock('uniswap/src/data/apiClients/dataApiService/clients/DataApiClientV2', () => ({
  dataApiServiceClientV2: {
    getEarnPosition: vi.fn(),
  },
}))

describe('getEarnPositionQueryOptions', () => {
  it('keeps the observer stable when closing a vault with no position', () => {
    const queryClient = new QueryClient()
    const selectPosition = (
      data: PlainMessage<GetEarnPositionResponse> | undefined,
    ): PlainMessage<GetEarnPositionResponse>['position'] => data?.position
    const options = getEarnPositionQueryOptions({
      params: { walletAddress: '0xwallet', vaultAddress: '0xvault', chainId: 1 },
      select: selectPosition,
    })
    queryClient.setQueryData(options.queryKey, toPlainMessage(new GetEarnPositionResponse()))

    const observer = new QueryObserver(queryClient, options)
    observer.trackProp('isSuccess')
    observer.trackProp('isPlaceholderData')
    const onChange = vi.fn()
    const unsubscribe = observer.subscribe(onChange)
    const closedOptions = getEarnPositionQueryOptions({ params: undefined, select: selectPosition })

    try {
      observer.setOptions(closedOptions)
      onChange.mockClear()

      // Model useQuery's render/effect cycle without starting an unbounded React update loop.
      for (let render = 0; render < 3; render++) {
        observer.getOptimisticResult(queryClient.defaultQueryOptions(closedOptions))
        observer.setOptions(closedOptions)
      }

      expect(observer.getCurrentResult()).toMatchObject({ data: undefined, isEnabled: false, fetchStatus: 'idle' })
      expect(onChange).not.toHaveBeenCalled()
      expect(dataApiServiceClientV2.getEarnPosition).not.toHaveBeenCalled()
    } finally {
      unsubscribe()
      queryClient.clear()
    }
  })
})
