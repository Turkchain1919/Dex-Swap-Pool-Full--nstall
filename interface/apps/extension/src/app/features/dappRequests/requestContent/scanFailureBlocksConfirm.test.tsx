import { render, screen } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import React, { useEffect } from 'react'
import type {
  SendCallsRequest,
  SendTransactionRequest,
  SignMessageRequest,
  SignTypedDataRequest,
} from 'src/app/features/dappRequests/types/DappRequestTypes'
import { EthMethod } from 'uniswap/src/features/dappRequests/types'
import { TransactionErrorType } from 'wallet/src/features/dappRequests/types'

// The fail-closed contract only holds if each consumer blocks confirmation on the null risk level
// its scanning child publishes. Typecheck proves the parents accept null, not that they act on it.

const ACCOUNT = '0x1111111111111111111111111111111111111111'
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
let mockDappLastChainId: UniverseChainId | undefined = UniverseChainId.Mainnet

vi.mock('src/app/features/dappRequests/DappRequestQueueContext', () => ({
  useDappRequestQueueContext: () => ({
    dappUrl: 'https://dapp.example',
    currentAccount: { address: ACCOUNT },
    request: { dappInfo: { lastChainId: UniverseChainId.Mainnet } },
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }),
}))

vi.mock('src/app/features/dapp/hooks', () => ({
  useDappLastChainId: () => mockDappLastChainId,
}))

vi.mock('src/app/features/dappRequests/hooks/usePrepareAndSignSendCallsTransaction', () => ({
  usePrepareAndSignSendCallsTransaction: () => ({
    gasFeeResult: { value: '1000', displayValue: '1000', isLoading: false, error: null },
    showSmartWalletActivation: false,
    isSponsoredUserOp: false,
  }),
}))

vi.mock('uniswap/src/features/gas/hooks/useEnableCustomGasFeeEntry', () => ({
  useEnableCustomGasFeeEntry: () => false,
}))

vi.mock('wallet/src/features/dappRequests/hooks/useSiteVerification', () => ({
  useSiteVerification: () => ({ verificationStatus: undefined }),
}))

vi.mock('uniswap/src/features/smartWallet/mismatch/hooks', () => ({
  useHasAccountMismatchCallback: () => () => false,
}))

vi.mock('src/app/features/dappRequests/requestContent/EthSend/Swap/useSwapRequestPermissionedBlock', () => ({
  useUniswapXSwapPermissionedBlock: () => ({ isBlocked: false }),
}))

vi.mock('@universe/gating', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFeatureFlag: () => false,
}))

vi.mock('wallet/src/components/ErrorBoundary/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))

// Stands in for the real confirm footer so the assertion is on the gate, not the button chrome.
vi.mock('src/app/features/dappRequests/DappRequestContent', () => ({
  DappRequestContent: ({ children, disableConfirm }: { children?: React.ReactNode; disableConfirm?: boolean }) => (
    <div>
      <div data-testid="confirm-disabled">{String(Boolean(disableConfirm))}</div>
      {children}
    </div>
  ),
}))

/** Every scanning child publishes null when it has no usable Blockaid verdict. */
function PublishesNullRisk({ onRiskLevelChange }: { onRiskLevelChange: (riskLevel: null) => void }): JSX.Element {
  useEffect(() => onRiskLevelChange(null), [onRiskLevelChange])
  return <div data-testid="scanning-child" />
}

vi.mock('wallet/src/components/dappRequests/DappPersonalSignContent', () => ({
  DappPersonalSignContent: PublishesNullRisk,
}))

vi.mock('wallet/src/components/dappRequests/DappSignTypedDataContent', () => ({
  DappSignTypedDataContent: PublishesNullRisk,
}))

vi.mock('wallet/src/components/dappRequests/DappSendCallsScanningContent', () => ({
  DappSendCallsScanningContent: PublishesNullRisk,
}))

vi.mock('wallet/src/components/dappRequests/DappTransactionScanningContent', () => ({
  DappTransactionScanningContent: PublishesNullRisk,
}))

vi.mock('wallet/src/components/BatchedTransactions/BatchedTransactionDetails', () => ({
  BatchedRequestDetailsContent: () => <div data-testid="batched-request-details" />,
}))

vi.mock('wallet/src/components/dappRequests/TransactionErrorSection', () => ({
  TransactionErrorSection: ({ errorType }: { errorType: TransactionErrorType }) => (
    <div data-testid="transaction-error">{errorType}</div>
  ),
}))

import { ParsedTransactionRequestContent } from 'src/app/features/dappRequests/requestContent/EthSend/ParsedTransaction/ParsedTransactionRequestContent'
import { PersonalSignRequestContent } from 'src/app/features/dappRequests/requestContent/PersonalSign/PersonalSignRequestContent'
import { SendCallsRequestHandler } from 'src/app/features/dappRequests/requestContent/SendCalls/SendCallsRequestContent'
import { SignTypedDataRequestContent } from 'src/app/features/dappRequests/requestContent/SignTypeData/SignTypedDataRequestContent'

const personalSignRequest = {
  type: 'SignMessage',
  requestId: 'sig-1',
  messageHex: '0x68656c6c6f',
  address: ACCOUNT,
} as unknown as SignMessageRequest

const typedDataRequest = {
  type: 'SignTypedData',
  requestId: 'typed-1',
  typedData: JSON.stringify({
    domain: { chainId: UniverseChainId.Mainnet, verifyingContract: PERMIT2 },
    primaryType: 'PermitSingle',
    types: { PermitSingle: [{ name: 'spender', type: 'address' }] },
    message: { spender: ACCOUNT },
  }),
} as unknown as SignTypedDataRequest

const sendCallsRequest = {
  type: EthMethod.WalletSendCalls,
  requestId: 'calls-1',
  chainId: `0x${UniverseChainId.Mainnet.toString(16)}`,
  calls: [{ to: PERMIT2, data: '0xabcdef' }],
  account: ACCOUNT,
  version: '2.0.0',
} as unknown as SendCallsRequest

const sendTransactionRequest = {
  type: 'SendTransaction',
  requestId: 'tx-1',
  transaction: {
    chainId: UniverseChainId.Mainnet,
    from: ACCOUNT,
    to: PERMIT2,
    data: '0x',
    value: '0x0',
  },
} as unknown as SendTransactionRequest

beforeEach(() => {
  mockDappLastChainId = UniverseChainId.Mainnet
})

describe('a scanning child that publishes no risk verdict blocks confirmation', () => {
  it('eth_sendTransaction', () => {
    render(
      <ParsedTransactionRequestContent
        dappRequest={sendTransactionRequest}
        transactionGasFeeResult={{ value: '1000', displayValue: '1000', isLoading: false, error: null }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByTestId('scanning-child')).toBeDefined()
    expect(screen.getByTestId('confirm-disabled').textContent).toBe('true')
  })

  it('personal_sign', () => {
    render(<PersonalSignRequestContent dappRequest={personalSignRequest} />)

    expect(screen.getByTestId('scanning-child')).toBeDefined()
    expect(screen.getByTestId('confirm-disabled').textContent).toBe('true')
  })

  it('eth_signTypedData', () => {
    render(<SignTypedDataRequestContent dappRequest={typedDataRequest} />)

    expect(screen.getByTestId('scanning-child')).toBeDefined()
    expect(screen.getByTestId('confirm-disabled').textContent).toBe('true')
  })

  it('wallet_sendCalls', () => {
    const request = {
      dappRequest: sendCallsRequest,
      dappInfo: { lastChainId: UniverseChainId.Mainnet },
    } as unknown as Parameters<typeof SendCallsRequestHandler>[0]['request']

    render(<SendCallsRequestHandler request={request} />)

    expect(screen.getByTestId('scanning-child')).toBeDefined()
    expect(screen.getByTestId('confirm-disabled').textContent).toBe('true')
  })

  it('wallet_sendCalls without a chain cannot bypass scanning through the fallback', () => {
    mockDappLastChainId = undefined
    const request = {
      dappRequest: sendCallsRequest,
      dappInfo: {},
    } as unknown as Parameters<typeof SendCallsRequestHandler>[0]['request']

    render(<SendCallsRequestHandler request={request} />)

    expect(screen.getByTestId('batched-request-details')).toBeDefined()
    expect(screen.getByTestId('confirm-disabled').textContent).toBe('true')
    expect(screen.getByTestId('transaction-error').textContent).toBe(TransactionErrorType.ScanUnavailable)
  })

  it('wallet_sendCalls swap without a chain cannot bypass scanning through the swap preview', () => {
    mockDappLastChainId = undefined
    const request = {
      dappRequest: {
        ...sendCallsRequest,
        calls: [
          {
            to: PERMIT2,
            data: '0xabcdef',
            parsedCalldata: { type: 'Swap' },
            contractInteractions: 'Swap',
          },
        ],
      },
      dappInfo: {},
    } as unknown as Parameters<typeof SendCallsRequestHandler>[0]['request']

    render(<SendCallsRequestHandler request={request} />)

    expect(screen.getByTestId('batched-request-details')).toBeDefined()
    expect(screen.getByTestId('confirm-disabled').textContent).toBe('true')
    expect(screen.getByTestId('transaction-error').textContent).toBe(TransactionErrorType.ScanUnavailable)
  })
})
