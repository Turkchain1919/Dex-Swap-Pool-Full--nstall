import { TransactionWarningBanner } from 'wallet/src/components/dappRequests/TransactionWarningBanner'
import { TransactionErrorType, TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import { renderWithProviders } from 'wallet/src/test/render'

vi.mock('react-i18next', async () => {
  const { default: sourceTranslations } = await import('uniswap/src/i18n/locales/source/en-US.json')
  const translations: Record<string, string> = sourceTranslations

  return {
    useTranslation: (): { t: (key: string) => string } => ({
      t: (key: string): string => translations[key] ?? key,
    }),
  }
})

vi.mock('wallet/src/components/dappRequests/DappScanInfoModal', () => ({
  DappScanInfoModal: (): null => null,
}))

describe('TransactionWarningBanner scan failure copy', () => {
  it('shows the safety warning for a transient scan failure', () => {
    const { getByText } = renderWithProviders(
      <TransactionWarningBanner
        riskLevel={TransactionRiskLevel.None}
        scanFailureError={TransactionErrorType.ScanFailed}
      />,
    )

    expect(getByText('Safety check unavailable')).toBeTruthy()
    expect(getByText('This request could not be checked for safety and may be malicious.')).toBeTruthy()
  })

  it('shows the permanent-loss warning without the former risk bullets', () => {
    const { getByText, queryByText } = renderWithProviders(
      <TransactionWarningBanner
        riskLevel={TransactionRiskLevel.None}
        scanFailureError={TransactionErrorType.ScanUnavailable}
        onConfirmRisk={vi.fn()}
      />,
    )

    expect(
      getByText(
        'This request could not be checked for safety and may be malicious. By continuing, you risk permanent loss of funds.',
      ),
    ).toBeTruthy()
    expect(getByText('I understand the risks')).toBeTruthy()
    expect(queryByText('Permanent loss of funds')).toBeNull()
    expect(queryByText('Malicious access to your wallet')).toBeNull()
    expect(queryByText('dapp.request.scanIncomplete.permanent.risk.lossOfFunds')).toBeNull()
    expect(queryByText('dapp.request.scanIncomplete.permanent.risk.maliciousAccess')).toBeNull()
  })
})
