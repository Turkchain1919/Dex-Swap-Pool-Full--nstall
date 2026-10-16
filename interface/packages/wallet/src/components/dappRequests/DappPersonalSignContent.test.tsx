import { UniverseChainId } from '@universe/chains'
import { EthMethod } from 'uniswap/src/features/dappRequests/types'
import { DappPersonalSignContent } from 'wallet/src/components/dappRequests/DappPersonalSignContent'
import { TransactionErrorType, TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import { render } from 'wallet/src/test/test-utils'

const previewProps: { current: Record<string, unknown> | undefined } = { current: undefined }
const footerProps: { current: Record<string, unknown> | undefined } = { current: undefined }

vi.mock('wallet/src/features/dappRequests/hooks/useBlockaidJsonRpcScan', () => ({
  useBlockaidJsonRpcScan: () => ({ scanResult: undefined, isLoading: false, hasScanFailed: true }),
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

vi.mock('wallet/src/components/dappRequests/SignatureMessageSection', () => ({
  SignatureMessageSection: () => null,
}))

describe('DappPersonalSignContent scan failure', () => {
  it('surfaces an acknowledgeable caution and keeps the acknowledgement path', () => {
    const onRiskLevelChange = vi.fn()

    render(
      <DappPersonalSignContent
        message="hello"
        chainId={UniverseChainId.Mainnet}
        account="0x1234567890123456789012345678901234567890"
        method={EthMethod.PersonalSign}
        params={['hello', '0x1234567890123456789012345678901234567890']}
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
