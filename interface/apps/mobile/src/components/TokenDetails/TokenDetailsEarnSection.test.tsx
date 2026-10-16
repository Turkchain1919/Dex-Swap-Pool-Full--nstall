import type { ReactNode } from 'react'
import { TokenDetailsEarnSection } from 'src/components/TokenDetails/TokenDetailsEarnSection'
import { render, screen } from 'src/test/test-utils'
import { EarnEntryPoint } from 'uniswap/src/features/earn/analytics'
import { useEarnPosition } from 'uniswap/src/features/earn/hooks/useEarnPosition'
import type { TokenDetailsEarnData } from 'uniswap/src/features/earn/hooks/useTokenDetailsEarnData'
import { EarnAction, type EarnPositionInfo, type EarnVaultInfo } from 'uniswap/src/features/earn/types'

const sharedSectionMock = vi.hoisted(() => vi.fn())
const accountMock = vi.hoisted(() => ({ isViewOnly: false }))
const mockNavigate = vi.fn()
const mockNavigateToEarnVault = vi.fn()

vi.mock('src/app/navigation/types', () => ({
  useAppStackNavigation: () => ({ navigate: mockNavigate }),
}))

vi.mock('wallet/src/contexts/WalletNavigationContext', () => ({
  WalletNavigationProvider: ({ children }: { children: ReactNode }): ReactNode => children,
  useWalletNavigation: () => ({ navigateToEarnVault: mockNavigateToEarnVault }),
}))

vi.mock('wallet/src/features/wallet/hooks', () => ({
  useIsViewOnlyWallet: (): boolean => accountMock.isViewOnly,
}))

vi.mock('uniswap/src/components/tokenDetails/TokenDetailsEarnSection', async () => {
  const { Text } = await vi.importActual<typeof import('@universe/mycelium')>('@universe/mycelium')
  return {
    TokenDetailsEarnSection: (props: {
      children?: ReactNode
      earnPosition: EarnPositionInfo
      rewardsUnavailable: boolean
    }) => {
      sharedSectionMock(props)
      return <Text testID="shared-earn-section">{props.earnPosition.vaultId}</Text>
    },
  }
})

vi.mock('uniswap/src/features/earn/hooks/useEarnDepositSources', () => ({
  useEarnDepositSources: () => ({ balanceLookupSettled: true, hasSupportedBalanceForUnderlying: true }),
}))

vi.mock('uniswap/src/features/earn/hooks/useEarnPosition', () => ({
  useEarnPosition: vi.fn(),
}))

const useEarnPositionMock = vi.mocked(useEarnPosition)

const vault = {
  id: 'vault-id',
  displayCurrencyId: '1-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
} as EarnVaultInfo

const prefetchedPosition = {
  vaultId: 'prefetched-position',
  depositedRaw: '1',
  sharesRaw: '1',
} as EarnPositionInfo

const detailedPosition = {
  vaultId: 'detailed-position',
  depositedRaw: '2',
  sharesRaw: '2',
} as EarnPositionInfo

const earnData = {
  balanceUsd: undefined,
  earnPosition: prefetchedPosition,
  earnVault: vault,
  hasLoadedPositions: true,
  isError: false,
  isLoggedIn: true,
  projectedAnnualEarningsUsd: undefined,
  refetch: vi.fn(),
  showEarnError: false,
  tokenSymbol: 'USDC',
  userHasEarnPosition: true,
} satisfies TokenDetailsEarnData

describe(TokenDetailsEarnSection, (): void => {
  beforeEach((): void => {
    sharedSectionMock.mockClear()
    mockNavigate.mockClear()
    mockNavigateToEarnVault.mockClear()
    accountMock.isViewOnly = false
  })

  it('hides a stale prefetched position after an authoritative empty response', (): void => {
    useEarnPositionMock.mockReturnValue({
      position: undefined,
      isError: false,
    } as ReturnType<typeof useEarnPosition>)

    render(<TokenDetailsEarnSection activeAddress="0x1" earnData={earnData} />)

    expect(screen.queryByTestId('shared-earn-section')).toBeNull()
  })

  it('renders the authoritative detailed position', (): void => {
    useEarnPositionMock.mockReturnValue({
      position: detailedPosition,
      isError: false,
    } as ReturnType<typeof useEarnPosition>)

    render(<TokenDetailsEarnSection activeAddress="0x1" earnData={earnData} />)

    expect(screen.getByText('detailed-position')).toBeDefined()
    expect(sharedSectionMock).toHaveBeenCalledWith(expect.objectContaining({ earnPosition: detailedPosition }))
  })

  it('keeps the fallback position visible with unavailable rewards after a query error', (): void => {
    useEarnPositionMock.mockReturnValue({
      position: prefetchedPosition,
      isError: true,
    } as ReturnType<typeof useEarnPosition>)

    render(<TokenDetailsEarnSection activeAddress="0x1" earnData={earnData} />)

    expect(sharedSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ earnPosition: prefetchedPosition, rewardsUnavailable: true }),
    )
  })

  it('routes a signer wallet deposit press directly into the deposit action', (): void => {
    useEarnPositionMock.mockReturnValue({
      position: detailedPosition,
      isError: false,
    } as ReturnType<typeof useEarnPosition>)

    render(<TokenDetailsEarnSection activeAddress="0x1" earnData={earnData} />)

    const sectionProps = sharedSectionMock.mock.calls[0]?.[0] as {
      onDepositPress: (pressVault: EarnVaultInfo, pressPosition: EarnPositionInfo) => void
    }
    sectionProps.onDepositPress(vault, detailedPosition)

    expect(mockNavigateToEarnVault).toHaveBeenCalledWith({
      analyticsEntryPoint: EarnEntryPoint.TokenDetailsEarnSection,
      vault,
      position: detailedPosition,
      initialAction: EarnAction.Deposit,
    })
  })

  it('routes a view-only wallet deposit press to the vault overview without the deposit action', (): void => {
    accountMock.isViewOnly = true
    useEarnPositionMock.mockReturnValue({
      position: detailedPosition,
      isError: false,
    } as ReturnType<typeof useEarnPosition>)

    render(<TokenDetailsEarnSection activeAddress="0x1" earnData={earnData} />)

    const sectionProps = sharedSectionMock.mock.calls[0]?.[0] as {
      onDepositPress: (pressVault: EarnVaultInfo, pressPosition: EarnPositionInfo) => void
    }
    sectionProps.onDepositPress(vault, detailedPosition)

    expect(mockNavigateToEarnVault).toHaveBeenCalledWith({
      analyticsEntryPoint: EarnEntryPoint.TokenDetailsEarnSection,
      vault,
      position: detailedPosition,
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
