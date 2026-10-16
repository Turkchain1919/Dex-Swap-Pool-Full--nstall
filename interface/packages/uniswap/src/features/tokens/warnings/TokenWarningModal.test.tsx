import { screen } from '@testing-library/react-native'
import { Token } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import { Text } from '@universe/mycelium'
import { ProtectionResult } from 'uniswap/src/features/dataApi/safety'
import { CurrencyInfo, TokenList } from 'uniswap/src/features/dataApi/types'
import TokenWarningModal from 'uniswap/src/features/tokens/warnings/TokenWarningModal'
import { renderWithProviders } from 'uniswap/src/test/render'
import { currencyId } from 'uniswap/src/utils/currencyId'

// The bottom sheet needs native modal context jsdom can't provide; the modal content is what's under test.
vi.mock('uniswap/src/components/modals/Modal', () => ({
  Modal: ({ children, isModalOpen }: { children: React.ReactNode; isModalOpen: boolean }): JSX.Element | null =>
    isModalOpen ? <>{children}</> : null,
}))

// The real notice renders its copy through <Trans>, which resolves to nothing under the test i18n instance.
vi.mock('uniswap/src/components/logos/PoweredByBlockaid', () => ({
  PoweredByBlockaid: (): JSX.Element => <Text>Powered by Blockaid</Text>,
}))

const TOKEN = new Token(UniverseChainId.Mainnet, '0x0000000000000000000000000000000000000001', 18, 'FEE', 'Fee Token')

function tokenCurrencyInfo(overrides?: Partial<CurrencyInfo>): CurrencyInfo {
  return {
    currencyId: currencyId(TOKEN),
    currency: TOKEN,
    logoUrl: null,
    safetyInfo: {
      tokenList: TokenList.Default,
      protectionResult: ProtectionResult.Benign,
    },
    ...overrides,
  }
}

describe('TokenWarningModal', () => {
  it('attributes the fees to Blockaid when opened as the fees modal from a swap quote', () => {
    renderWithProviders(
      <TokenWarningModal
        isVisible
        isInfoOnlyWarning
        currencyInfo0={tokenCurrencyInfo()}
        feeOnTransferOverride={{ sellFeePercent: 5 }}
        closeModalOnly={vi.fn()}
        onAcknowledge={vi.fn()}
      />,
    )

    expect(screen.getByText('Powered by Blockaid')).toBeTruthy()
  })

  it('attributes the fees to Blockaid for a fee below the high-fee breakpoint', () => {
    renderWithProviders(
      <TokenWarningModal
        isVisible
        isInfoOnlyWarning
        currencyInfo0={tokenCurrencyInfo()}
        feeOnTransferOverride={{ sellFeePercent: 1 }}
        closeModalOnly={vi.fn()}
        onAcknowledge={vi.fn()}
      />,
    )

    expect(screen.getByText('Powered by Blockaid')).toBeTruthy()
  })

  it('omits the Blockaid attribution for a blocked token, even when it charges fees', () => {
    renderWithProviders(
      <TokenWarningModal
        isVisible
        currencyInfo0={tokenCurrencyInfo({
          safetyInfo: {
            tokenList: TokenList.Blocked,
            protectionResult: ProtectionResult.Benign,
            blockaidFees: { sellFeePercent: 1 },
          },
        })}
        closeModalOnly={vi.fn()}
        onAcknowledge={vi.fn()}
      />,
    )

    expect(screen.queryByText('Powered by Blockaid')).toBeNull()
  })

  it('omits the Blockaid attribution for a token that is only missing from the default list', () => {
    renderWithProviders(
      <TokenWarningModal
        isVisible
        currencyInfo0={tokenCurrencyInfo({
          safetyInfo: { tokenList: TokenList.NonDefault, protectionResult: ProtectionResult.Benign },
        })}
        closeModalOnly={vi.fn()}
        onAcknowledge={vi.fn()}
      />,
    )

    expect(screen.queryByText('Powered by Blockaid')).toBeNull()
  })
})
