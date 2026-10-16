import { DEFAULT_GAS_URGENCY } from 'uniswap/src/features/gas/consts'
import { useTransactionGasFee } from 'uniswap/src/features/gas/hooks'
import { SendContextProvider } from 'wallet/src/features/transactions/contexts/SendContext'
import { useDerivedSendInfo } from 'wallet/src/features/transactions/send/hooks/useDerivedSendInfo'
import { signerMnemonicAccount } from 'wallet/src/test/fixtures'
import { preloadedWalletPackageState } from 'wallet/src/test/fixtures/wallet/redux'
import { renderWithProviders } from 'wallet/src/test/render'

vi.mock('uniswap/src/features/gas/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('uniswap/src/features/gas/hooks')>()),
  useTransactionGasFee: vi.fn(() => ({})),
  useTransactionGasWarning: vi.fn(() => undefined),
}))
vi.mock('uniswap/src/features/gas/hooks/useMaxAmountSpend', () => ({
  useMaxAmountSpend: vi.fn(() => undefined),
}))
vi.mock('uniswap/src/features/permissionedTokens/useIsPermissionedSendBlocked', () => ({
  useIsPermissionedSendBlocked: vi.fn(() => ({
    isPermissionedSendBlocked: false,
    isPermissionedSendBlockedLoading: false,
    permissionedSendBlockReason: undefined,
  })),
}))
vi.mock('wallet/src/features/transactions/send/hooks/useDerivedSendInfo', () => ({
  useDerivedSendInfo: vi.fn(),
}))
vi.mock('wallet/src/features/transactions/send/hooks/useSendTransactionRequest', () => ({
  useSendTransactionRequest: vi.fn(() => ({ data: { chainId: 1, from: '0x1', to: '0x2', value: '0x0' } })),
}))
vi.mock('wallet/src/features/transactions/send/hooks/useSendWarnings', () => ({
  useSendWarnings: vi.fn(() => []),
}))

const mockedUseTransactionGasFee = vi.mocked(useTransactionGasFee)

describe('SendContextProvider', () => {
  it('requests send gas estimates at DEFAULT_GAS_URGENCY', () => {
    vi.mocked(useDerivedSendInfo).mockReturnValue({
      chainId: 1,
      currencyAmounts: {},
      currencyBalances: {},
      currencyTypes: {},
      currencies: {},
      currencyInInfo: undefined,
      exactAmountToken: '',
      exactAmountFiat: '',
      exactCurrencyField: 'input',
      nftIn: undefined,
      recipient: undefined,
    } as unknown as ReturnType<typeof useDerivedSendInfo>)

    renderWithProviders(<SendContextProvider>{null}</SendContextProvider>, {
      preloadedState: preloadedWalletPackageState({ account: signerMnemonicAccount() }),
    })

    expect(mockedUseTransactionGasFee).toHaveBeenCalled()
    const lastCall = mockedUseTransactionGasFee.mock.calls.at(-1)?.[0]
    expect(lastCall?.urgency).toBe(DEFAULT_GAS_URGENCY)
  })
})
