import { UniverseChainId } from '@universe/chains'
import { DappSendCallsScanningContent } from 'wallet/src/components/dappRequests/DappSendCallsScanningContent'
import { type Call, TransactionErrorType, TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import { render } from 'wallet/src/test/test-utils'

const previewProps: { current: Record<string, unknown> | undefined } = { current: undefined }
const footerProps: { current: Record<string, unknown> | undefined } = { current: undefined }
const scanRequest: { current: unknown } = { current: undefined }
let mockHasScanFailed = true

vi.mock('wallet/src/features/dappRequests/hooks/useBlockaidJsonRpcScan', () => ({
  useBlockaidJsonRpcScan: (request: unknown) => {
    scanRequest.current = request
    return { scanResult: undefined, isLoading: false, hasScanFailed: mockHasScanFailed }
  },
}))

vi.mock('wallet/src/components/dappRequests/TransactionPreviewCard', () => ({
  TransactionPreviewCard: (props: Record<string, unknown>) => {
    previewProps.current = props
    return null
  },
}))

vi.mock('wallet/src/components/dappRequests/DappRequestFooter', () => ({
  DappRequestFooter: (props: Record<string, unknown>) => {
    footerProps.current = props
    return null
  },
}))

vi.mock('wallet/src/features/dappRequests/hooks/useEarnAwareSections', () => ({
  useEarnAwareSections: ({ sections }: { sections: unknown[] }) => sections,
}))

describe('DappSendCallsScanningContent scan failure', () => {
  beforeEach(() => {
    previewProps.current = undefined
    footerProps.current = undefined
    scanRequest.current = undefined
    mockHasScanFailed = true
  })

  it('surfaces an informational caution (no gate) when the sendCalls scan fails transiently', () => {
    const onRiskLevelChange = vi.fn()

    render(
      <DappSendCallsScanningContent
        request={{ calls: [{ to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', data: '0x' }] }}
        chainId={UniverseChainId.Mainnet}
        account="0x1234567890123456789012345678901234567890"
        dappUrl="https://dapp.example"
        confirmedRisk={false}
        onConfirmRisk={vi.fn()}
        onRiskLevelChange={onRiskLevelChange}
      />,
    )

    // A transient scan failure is warn-and-allow: it publishes no gating verdict (None, not a hard
    // block), so confirmation stays enabled with an informational caution (ScanFailed) and no checkbox.
    expect(onRiskLevelChange).toHaveBeenLastCalledWith(TransactionRiskLevel.None)
    expect(footerProps.current).toMatchObject({
      riskLevel: TransactionRiskLevel.None,
      scanFailureError: TransactionErrorType.ScanFailed,
    })
    expect(footerProps.current?.['onConfirmRisk']).toBeDefined()
  })

  it('scans the canonical calls with a pinned version and withholds dapp envelope metadata', () => {
    mockHasScanFailed = false
    const decoratedValueCall = {
      to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      value: '0x1',
      functionSignature: 'attacker-controlled preview metadata',
      parsedCalldata: { ignored: true },
    } as unknown as Call

    render(
      <DappSendCallsScanningContent
        request={
          {
            calls: [decoratedValueCall],
            version: '2.0.0',
            id: `0x${'12'.repeat(32)}`,
            // A dapp-controlled paymaster credential URL — the component must not forward it to Blockaid.
            capabilities: { paymasterService: { url: 'https://paymaster.example' } },
          } as unknown as Parameters<typeof DappSendCallsScanningContent>[0]['request']
        }
        chainId={UniverseChainId.Mainnet}
        account="0x1234567890123456789012345678901234567890"
        dappUrl="https://dapp.example"
        confirmedRisk={false}
        onConfirmRisk={vi.fn()}
        onRiskLevelChange={vi.fn()}
      />,
    )

    expect(scanRequest.current).toMatchObject({
      data: {
        method: 'wallet_sendCalls',
        params: [
          {
            // Version is pinned to the scanner-supported constant, NOT the dapp's '2.0.0'.
            version: '1.0',
            chainId: '0x1',
            from: '0x1234567890123456789012345678901234567890',
            calls: [
              {
                to: decoratedValueCall.to,
                data: '0x',
                value: '0x1',
              },
            ],
          },
        ],
      },
    })

    const scannedParams = (scanRequest.current as { data: { params: Array<Record<string, unknown>> } }).data.params[0]
    expect(scannedParams?.['calls']).toEqual([
      {
        to: decoratedValueCall.to,
        data: '0x',
        value: '0x1',
      },
    ])
    // No dapp-controlled envelope metadata may reach the third-party scanner: the dapp's `version` is
    // replaced by the pinned constant, and `id` and `capabilities` (here carrying a paymaster credential
    // URL) are dropped entirely — neither the keys nor any of their values may leak.
    expect(scannedParams?.['version']).toBe('1.0')
    expect(scannedParams).not.toHaveProperty('id')
    expect(scannedParams).not.toHaveProperty('capabilities')
    expect(JSON.stringify(scanRequest.current)).not.toContain('paymaster.example')
  })

  it('hard-blocks a batch that cannot be normalized, with no acknowledgement path', () => {
    // `useBlockaidJsonRpcScan(null)` reports a failure for the un-buildable request, so pin
    // `hasScanFailed = true` to prove the `localBlock` hard block takes precedence over the
    // scan-failure branch (deriveScanGating evaluates localBlock first) rather than degrading to the
    // acknowledgeable caution.
    mockHasScanFailed = true
    const onRiskLevelChange = vi.fn()

    render(
      <DappSendCallsScanningContent
        request={
          {
            // A per-call capability the wallet cannot represent fails normalization, so the batch can be
            // neither encoded for execution nor scanned.
            calls: [
              { to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', data: '0x', capabilities: { foo: { bar: 1 } } },
            ],
            version: '2.0.0',
          } as unknown as Parameters<typeof DappSendCallsScanningContent>[0]['request']
        }
        chainId={UniverseChainId.Mainnet}
        account="0x1234567890123456789012345678901234567890"
        dappUrl="https://dapp.example"
        confirmedRisk={false}
        onConfirmRisk={vi.fn()}
        onRiskLevelChange={onRiskLevelChange}
      />,
    )

    // A local hard block publishes no verdict (null keeps Confirm disabled) and forwards no
    // acknowledgement handler, so an un-encodable batch can never be confirmed into an empty payload.
    expect(onRiskLevelChange).toHaveBeenLastCalledWith(null)
    expect(previewProps.current).toMatchObject({ errorType: TransactionErrorType.DecodeTransaction })
    expect(footerProps.current?.['onConfirmRisk']).toBeUndefined()
    // The batch is never sent to Blockaid because it cannot be normalized into canonical calls.
    expect(scanRequest.current).toBeNull()
  })
})
