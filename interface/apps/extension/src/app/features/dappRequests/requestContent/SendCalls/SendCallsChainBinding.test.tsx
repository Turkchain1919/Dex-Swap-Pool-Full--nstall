import { render, screen } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import React from 'react'
import type { SendCallsRequest } from 'src/app/features/dappRequests/types/DappRequestTypes'
import { DappRequestType } from 'uniswap/src/features/dappRequests/types'

// The prompt prepares, scans, and labels a queued wallet_sendCalls against the chain it was
// authorized on at queue time. The dapp's live chain can move while the prompt is open
// (wallet_switchEthereumChain is auto-confirmed) and the background handler signs on the queued
// chain, so the live chain must never reach the preparation or scan path.

const ACCOUNT = '0x1111111111111111111111111111111111111111'
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

let mockLiveChainId: UniverseChainId | undefined = UniverseChainId.Base
let mockPreparedChainId: UniverseChainId | undefined

vi.mock('src/app/features/dappRequests/DappRequestQueueContext', () => ({
  useDappRequestQueueContext: () => ({
    dappUrl: 'https://dapp.example',
    currentAccount: { address: ACCOUNT },
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }),
}))

vi.mock('src/app/features/dapp/hooks', () => ({
  useDappLastChainId: () => mockLiveChainId,
}))

// Records the chain the prompt prepares on. Whatever lands here is what encode_4337 and the
// delegation lookup would be asked for.
vi.mock('src/app/features/dappRequests/hooks/usePrepareAndSignSendCallsTransaction', () => ({
  usePrepareAndSignSendCallsTransaction: ({ chainId }: { chainId?: UniverseChainId }) => {
    mockPreparedChainId = chainId
    return {
      gasFeeResult: { value: '0', isLoading: false, error: null },
      showSmartWalletActivation: false,
      isSponsoredUserOp: true,
    }
  },
}))

vi.mock('uniswap/src/features/gas/hooks/useEnableCustomGasFeeEntry', () => ({
  useEnableCustomGasFeeEntry: () => false,
}))

vi.mock('wallet/src/features/dappRequests/hooks/useSiteVerification', () => ({
  useSiteVerification: () => ({ verificationStatus: undefined }),
}))

// Stubbed to keep these tests on chain routing, without the Tamagui theme and redux providers.
vi.mock('src/app/features/dappRequests/DappRequestContent', () => ({
  DappRequestContent: ({
    children,
    chainId,
    disableConfirm,
  }: {
    children?: React.ReactNode
    chainId?: number
    disableConfirm?: boolean
  }) => (
    <div>
      <div data-testid="prompt-chain-id">{String(chainId)}</div>
      <div data-testid="confirm-disabled">{String(Boolean(disableConfirm))}</div>
      {children}
    </div>
  ),
}))

// Rendering this means the component trusted a chain enough to scan on it.
vi.mock('wallet/src/components/dappRequests/DappSendCallsScanningContent', () => ({
  DappSendCallsScanningContent: ({ chainId }: { chainId: number }) => (
    <div data-testid="scan-path" data-chain-id={String(chainId)} />
  ),
}))

vi.mock('wallet/src/components/BatchedTransactions/BatchedTransactionDetails', () => ({
  BatchedRequestDetailsContent: () => <div data-testid="batched-request-details" />,
}))

vi.mock('wallet/src/components/dappRequests/TransactionErrorSection', () => ({
  TransactionErrorSection: () => <div data-testid="transaction-error" />,
}))

import { SendCallsRequestHandler } from 'src/app/features/dappRequests/requestContent/SendCalls/SendCallsRequestContent'

type HandlerRequest = Parameters<typeof SendCallsRequestHandler>[0]['request']

function queuedRequest({
  requestChainId,
  snapshotChainId,
}: {
  requestChainId: string
  snapshotChainId: UniverseChainId | undefined
}): HandlerRequest {
  return {
    dappRequest: {
      type: DappRequestType.SendCalls,
      requestId: 'calls-1',
      version: '2.0.0',
      from: ACCOUNT,
      chainId: requestChainId,
      calls: [{ to: PERMIT2, data: '0xabcdef' }],
    } as unknown as SendCallsRequest,
    dappInfo: snapshotChainId ? { lastChainId: snapshotChainId } : undefined,
  } as unknown as HandlerRequest
}

function expectFallbackWithConfirmDisabled(): void {
  expect(mockPreparedChainId).toBeUndefined()
  expect(screen.queryByTestId('scan-path')).toBeNull()
  expect(screen.getByTestId('batched-request-details')).toBeTruthy()
  expect(screen.getByTestId('confirm-disabled').textContent).toBe('true')
}

describe('SendCallsRequestHandler chain binding', () => {
  beforeEach(() => {
    mockLiveChainId = UniverseChainId.Base
    mockPreparedChainId = undefined
  })

  it('prepares, scans, and labels on the queued chain after the dapp moved its live chain', () => {
    render(
      <SendCallsRequestHandler
        request={queuedRequest({ requestChainId: '0x1', snapshotChainId: UniverseChainId.Mainnet })}
      />,
    )

    expect(mockPreparedChainId).toBe(UniverseChainId.Mainnet)
    expect(screen.getByTestId('scan-path').getAttribute('data-chain-id')).toBe(String(UniverseChainId.Mainnet))
    expect(screen.getByTestId('prompt-chain-id').textContent).toBe(String(UniverseChainId.Mainnet))
  })

  it('falls back with confirm disabled when the request chain disagrees with the queued snapshot', () => {
    render(
      <SendCallsRequestHandler
        request={queuedRequest({
          requestChainId: `0x${UniverseChainId.Base.toString(16)}`,
          snapshotChainId: UniverseChainId.Mainnet,
        })}
      />,
    )

    expectFallbackWithConfirmDisabled()
  })

  it('falls back with confirm disabled when there is no queued snapshot to bind to', () => {
    render(<SendCallsRequestHandler request={queuedRequest({ requestChainId: '0x1', snapshotChainId: undefined })} />)

    expectFallbackWithConfirmDisabled()
  })
})
