import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { usePrepareAndSignSendCallsTransaction } from 'src/app/features/dappRequests/hooks/usePrepareAndSignSendCallsTransaction'
import type { DappRequestStoreItemForSendCallsTxn } from 'src/app/features/dappRequests/slice'
import type { Account } from 'wallet/src/features/wallet/accounts/types'

const { mockUseFeatureFlag, mockUseWalletEncode4337Query, mockUseWalletEncode7702Query } = vi.hoisted(() => ({
  mockUseFeatureFlag: vi.fn(() => false),
  mockUseWalletEncode4337Query: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
  mockUseWalletEncode7702Query: vi.fn(() => ({ data: undefined })),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}))

vi.mock('@universe/gating', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFeatureFlag: mockUseFeatureFlag,
}))

vi.mock('src/app/features/dappRequests/hooks/usePrepareAndSignDappTransaction', () => ({
  usePrepareAndSignDappTransaction: vi.fn(() => ({ preSignedTransaction: undefined })),
}))

vi.mock('src/app/features/dappRequests/hooks/useTransactionGasEstimation', () => ({
  useTransactionGasEstimation: vi.fn(() => ({
    gasFeeResult: { value: undefined, isLoading: false, error: null },
    isInvalidGasFeeResult: false,
  })),
}))

vi.mock('uniswap/src/contexts/UniswapContext', () => ({
  useSignDelegationAuthorization: vi.fn(() => undefined),
}))

vi.mock('uniswap/src/data/apiClients/tradingApi/useWalletEncode4337Query', () => ({
  useWalletEncode4337Query: mockUseWalletEncode4337Query,
}))

vi.mock('uniswap/src/data/apiClients/tradingApi/useWalletEncode7702Query', () => ({
  useWalletEncode7702Query: mockUseWalletEncode7702Query,
}))

vi.mock('wallet/src/features/smartWallet/hooks/useLiveAccountDelegationDetails', () => ({
  useLiveAccountDelegationDetails: vi.fn(() => ({
    contractAddress: '0x2222222222222222222222222222222222222222',
    needsDelegation: false,
  })),
}))

describe(usePrepareAndSignSendCallsTransaction, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseFeatureFlag.mockReturnValue(false)
  })

  it('does not encode a persisted invalid batch before the blocked scan preview can render', () => {
    const request = {
      dappRequest: {
        calls: [{ to: '0x1234', data: '0xabcdef' }],
      },
    } as unknown as DappRequestStoreItemForSendCallsTxn
    const account = { address: '0x1111111111111111111111111111111111111111' } as unknown as Account

    expect(() =>
      renderHook(() =>
        usePrepareAndSignSendCallsTransaction({
          request,
          account,
          chainId: UniverseChainId.Mainnet,
        }),
      ),
    ).not.toThrow()

    expect(mockUseWalletEncode7702Query).toHaveBeenCalledWith({ enabled: false, params: undefined })
  })

  it('does not encode a persisted invalid sponsored batch through the 4337 path', () => {
    mockUseFeatureFlag.mockReturnValue(true)
    const request = {
      dappRequest: {
        calls: [{ to: '0x1234', data: '0xabcdef' }],
        capabilities: { paymasterService: { url: 'https://paymaster.example' } },
      },
    } as unknown as DappRequestStoreItemForSendCallsTxn
    const account = { address: '0x1111111111111111111111111111111111111111' } as unknown as Account

    expect(() =>
      renderHook(() =>
        usePrepareAndSignSendCallsTransaction({
          request,
          account,
          chainId: UniverseChainId.Mainnet,
        }),
      ),
    ).not.toThrow()

    expect(mockUseWalletEncode4337Query).toHaveBeenCalledWith({ params: undefined })
    expect(mockUseWalletEncode7702Query).toHaveBeenCalledWith({ enabled: false, params: undefined })
  })
})
