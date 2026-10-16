import { act, render, waitFor } from '@testing-library/react-native'
import { UniverseChainId } from '@universe/chains'
import type { ReactNode } from 'react'
import type { EIP681URI } from 'src/components/Requests/ScanSheet/util'
import { URIType } from 'src/components/Requests/ScanSheet/util'
import type { QrCodeSelection } from 'src/features/send/qrCodeSelection'
import { QrCodeSelectionChangeType, QrCodeSelectionType } from 'src/features/send/qrCodeSelection'
import { SendFlow } from 'src/features/send/SendFlow'
import { getNativeAddress } from 'uniswap/src/constants/addresses'
import { AssetType } from 'uniswap/src/entities/assets'
import type { TradeableAsset } from 'uniswap/src/entities/assets'

const { RECIPIENT, mockSendFormScreen, mockSetScreen, sendState } = vi.hoisted(() => ({
  RECIPIENT: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  mockSendFormScreen: vi.fn(),
  mockSetScreen: vi.fn(),
  sendState: {
    input: null as TradeableAsset | null,
    recipient: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  },
}))

type SendFormScreenProps = {
  pendingQrCodeSelection?: QrCodeSelection
  onClearQrCodeSelection: () => void
  onQrCodeSelectionChange: (paymentRequest?: EIP681URI) => void
}

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: () => ({ initialState: undefined }),
}))

vi.mock('src/components/icons/useBiometricsIcon', () => ({ useBiometricsIcon: () => null }))
vi.mock('src/features/biometrics/useBiometricAppSettings', () => ({
  useBiometricAppSettings: () => ({ requiredForTransactions: false }),
}))
vi.mock('src/features/biometrics/useOsBiometricAuthEnabled', () => ({ useOsBiometricAuthEnabled: () => false }))
vi.mock('src/features/biometricsSettings/hooks', () => ({ useBiometricPrompt: () => ({ trigger: vi.fn() }) }))
vi.mock('src/features/wallet/useWalletRestore', () => ({
  useWalletRestore: () => ({ walletNeedsRestore: false, openWalletRestoreModal: vi.fn() }),
}))

vi.mock('src/features/send/SendFormScreen', () => ({
  SendFormScreen: (props: SendFormScreenProps) => {
    mockSendFormScreen(props)
    return null
  },
}))
vi.mock('src/features/send/SendRecipientSelectFullScreen', () => ({ SendRecipientSelectFullScreen: () => null }))
vi.mock('src/features/send/SendReviewScreen', () => ({ SendReviewScreen: () => null }))

vi.mock('uniswap/src/features/chains/hooks/useEnabledChains', () => ({
  useEnabledChains: () => ({ defaultChainId: UniverseChainId.Mainnet }),
}))
vi.mock('uniswap/src/features/telemetry/Trace', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('uniswap/src/features/transactions/components/TransactionModal/TransactionModal', () => ({
  TransactionModal: ({ children }: { children: ReactNode }) => children,
}))
vi.mock(
  'uniswap/src/features/transactions/components/settings/stores/transactionSettingsStore/TransactionSettingsStoreContextProvider',
  () => ({ TransactionSettingsStoreContextProvider: ({ children }: { children: ReactNode }) => children }),
)
vi.mock('uniswap/src/features/transactions/swap/stores/swapFormStore/SwapFormStoreContextProvider', () => ({
  SwapFormStoreContextProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock(
  'uniswap/src/features/transactions/components/TransactionModal/TransactionModalContext',
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import('uniswap/src/features/transactions/components/TransactionModal/TransactionModalContext')
      >()
    return {
      ...original,
      useTransactionModalContext: () => ({ screen: original.TransactionScreen.Form, setScreen: mockSetScreen }),
    }
  },
)
vi.mock('wallet/src/features/transactions/contexts/SendContext', () => ({
  SendContextProvider: ({ children }: { children: ReactNode }) => children,
  useSendContext: () => sendState,
}))

describe(SendFlow, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendState.input = null
  })

  it('reclassifies a pending initial QR selection against the latest input', () => {
    const paymentRequest: EIP681URI = {
      type: URIType.EIP681,
      value: RECIPIENT,
      chainId: UniverseChainId.Base,
      tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    }
    const { rerender } = render(<SendFlow />)

    act(() => {
      const props = mockSendFormScreen.mock.lastCall?.[0] as SendFormScreenProps
      props.onQrCodeSelectionChange(paymentRequest)
    })
    expect((mockSendFormScreen.mock.lastCall?.[0] as SendFormScreenProps).pendingQrCodeSelection).toEqual({
      type: QrCodeSelectionType.Initial,
      chainId: UniverseChainId.Base,
      tokenAddress: paymentRequest.tokenAddress,
    })

    sendState.input = {
      type: AssetType.Currency,
      chainId: UniverseChainId.Mainnet,
      address: getNativeAddress(UniverseChainId.Mainnet),
    }
    rerender(<SendFlow />)

    expect((mockSendFormScreen.mock.lastCall?.[0] as SendFormScreenProps).pendingQrCodeSelection).toEqual({
      type: QrCodeSelectionType.Change,
      changeType: QrCodeSelectionChangeType.NetworkAndToken,
      chainId: UniverseChainId.Base,
      tokenAddress: paymentRequest.tokenAddress,
    })
  })

  it('clears a pending QR request once the live input matches it', async () => {
    const tokenAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    const paymentRequest: EIP681URI = {
      type: URIType.EIP681,
      value: RECIPIENT,
      chainId: UniverseChainId.Base,
      tokenAddress,
    }
    const { rerender } = render(<SendFlow />)

    act(() => {
      const props = mockSendFormScreen.mock.lastCall?.[0] as SendFormScreenProps
      props.onQrCodeSelectionChange(paymentRequest)
    })

    sendState.input = { type: AssetType.Currency, chainId: UniverseChainId.Base, address: tokenAddress }
    rerender(<SendFlow />)
    await waitFor(() => {
      expect((mockSendFormScreen.mock.lastCall?.[0] as SendFormScreenProps).pendingQrCodeSelection).toBeUndefined()
    })

    sendState.input = {
      type: AssetType.Currency,
      chainId: UniverseChainId.Mainnet,
      address: getNativeAddress(UniverseChainId.Mainnet),
    }
    rerender(<SendFlow />)

    expect((mockSendFormScreen.mock.lastCall?.[0] as SendFormScreenProps).pendingQrCodeSelection).toBeUndefined()
  })
})
