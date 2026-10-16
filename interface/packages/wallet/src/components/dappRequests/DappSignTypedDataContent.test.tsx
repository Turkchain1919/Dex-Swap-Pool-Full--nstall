import { UniverseChainId } from '@universe/chains'
import { DappSignTypedDataContent } from 'wallet/src/components/dappRequests/DappSignTypedDataContent'
import { TransactionErrorType, TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import { render } from 'wallet/src/test/test-utils'

const previewProps: { current: Record<string, unknown> | undefined } = { current: undefined }
const footerProps: { current: Record<string, unknown> | undefined } = { current: undefined }

vi.mock('wallet/src/features/dappRequests/hooks/useTypedDataSections', () => ({
  useTypedDataSections: () => ({
    sections: [],
    riskLevel: TransactionRiskLevel.None,
    isLoading: false,
    hasScanFailed: true,
  }),
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

vi.mock('wallet/src/components/dappRequests/DappSendCallsScanningContent', () => ({
  isV3NonfungiblePositionManager: () => false,
}))

vi.mock('wallet/src/components/dappRequests/SignTypedData/StandardTypedDataContent', () => ({
  StandardTypedDataContent: () => null,
}))

const typedData = JSON.stringify({
  types: {
    EIP712Domain: [{ name: 'chainId', type: 'uint256' }],
    Message: [{ name: 'contents', type: 'string' }],
  },
  primaryType: 'Message',
  domain: { chainId: 1 },
  message: { contents: 'hello' },
})

describe('DappSignTypedDataContent scan failure', () => {
  it('surfaces an acknowledgeable caution and keeps the acknowledgement path', () => {
    const onRiskLevelChange = vi.fn()

    render(
      <DappSignTypedDataContent
        typedData={typedData}
        chainId={UniverseChainId.Mainnet}
        account="0x1234567890123456789012345678901234567890"
        method="eth_signTypedData_v4"
        params={['0x1234567890123456789012345678901234567890', typedData]}
        dappUrl="https://dapp.example"
        confirmedRisk={false}
        onConfirmRisk={vi.fn()}
        onRiskLevelChange={onRiskLevelChange}
      />,
    )

    // A transient scan failure is informational: no preview verdict, no gating verdict (None), and
    // the footer carries the scan-failure caution which the banner renders without a checkbox.
    expect(onRiskLevelChange).toHaveBeenLastCalledWith(TransactionRiskLevel.None)
    expect(previewProps.current).toMatchObject({
      errorType: undefined,
      riskLevel: TransactionRiskLevel.None,
    })
    expect(footerProps.current).toMatchObject({
      riskLevel: TransactionRiskLevel.None,
      scanFailureError: TransactionErrorType.ScanFailed,
    })
  })
})
