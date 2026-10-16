import { UniverseChainId } from '@universe/chains'
import type { ReactNode } from 'react'
import { EarnHowItWorksModal } from 'src/components/earn/EarnHowItWorksModal'
import { fireEvent, getOwnStyleProp, render, screen } from 'src/test/test-utils'
import { EarnEntryPoint } from 'uniswap/src/features/earn/analytics'
import { EarnPositionStatus } from 'uniswap/src/features/earn/hooks/useEarnPosition'
import { EarnAction, type EarnVaultInfo } from 'uniswap/src/features/earn/types'
import { ModalName } from 'uniswap/src/features/telemetry/constants'

const mockReplace = vi.fn()
let mockPositionStatus: EarnPositionStatus | undefined
const { mockLogEarnHowItWorksAcknowledged } = vi.hoisted(() => ({
  mockLogEarnHowItWorksAcknowledged: vi.fn(),
}))

vi.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('src/app/navigation/types', () => ({
  useAppStackNavigation: () => ({ replace: mockReplace }),
}))

vi.mock('uniswap/src/components/modals/Modal', () => ({
  Modal: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('uniswap/src/features/earn/EarnHowItWorksView', async () => {
  const { Text } = await vi.importActual<typeof import('@universe/mycelium')>('@universe/mycelium')
  return {
    EarnHowItWorksView: ({ onContinue }: { onContinue: () => void }) => (
      <>
        <Text>How it works</Text>
        <Text testID="continue-how-it-works" onPress={onContinue}>
          Continue
        </Text>
      </>
    ),
  }
})

vi.mock('uniswap/src/features/earn/analytics', async () => ({
  ...(await vi.importActual('uniswap/src/features/earn/analytics')),
  getEarnVaultAnalyticsProperties: vi.fn(() => ({ vault_id: 'vault-id' })),
  logEarnHowItWorksAcknowledged: mockLogEarnHowItWorksAcknowledged,
}))

vi.mock('uniswap/src/features/earn/hooks/useEarnPosition', async () => {
  const actual = await vi.importActual<typeof import('uniswap/src/features/earn/hooks/useEarnPosition')>(
    'uniswap/src/features/earn/hooks/useEarnPosition',
  )
  return {
    ...actual,
    useEarnPosition: () => ({
      position: undefined,
      positionStatus: mockPositionStatus ?? actual.EarnPositionStatus.NoPosition,
    }),
  }
})

vi.mock('wallet/src/features/wallet/hooks', () => ({
  useActiveAccountAddress: (): string => '0x0000000000000000000000000000000000000001',
  useIsViewOnlyWallet: (): boolean => false,
}))

const vault = {
  id: 'vault-id',
  vaultAddress: '0x0000000000000000000000000000000000000002',
  chainId: UniverseChainId.Mainnet,
} as EarnVaultInfo

describe(EarnHowItWorksModal, () => {
  beforeEach(() => {
    mockLogEarnHowItWorksAcknowledged.mockClear()
    mockPositionStatus = undefined
    mockReplace.mockClear()
  })

  it('records acknowledgement and continues to the original deposit route', () => {
    const { store } = render(
      <EarnHowItWorksModal
        analyticsEntryPoint={EarnEntryPoint.GlobalModal}
        initialAction={EarnAction.Deposit}
        initialAmount="12"
        initialSourceCurrencyId="1-0xusdc"
        isOpen
        vault={vault}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('How it works')).toBeDefined()

    fireEvent.press(screen.getByTestId('continue-how-it-works'))

    expect(store.getState().uniswapBehaviorHistory.earnHowItWorksAcknowledgedByVaultId?.[vault.id]).toBe(true)
    expect(mockLogEarnHowItWorksAcknowledged).toHaveBeenCalledWith({ vault_id: 'vault-id' })
    expect(mockReplace).toHaveBeenCalledWith(ModalName.EarnDepositAmount, {
      analyticsEntryPoint: EarnEntryPoint.GlobalModal,
      initialAction: EarnAction.Deposit,
      initialAmount: '12',
      initialSourceCurrencyId: '1-0xusdc',
      vault,
    })
  })

  // CONS-2919: the wrapper's opaque background makes it an RNGH touch target on Android so empty-space taps don't
  // dismiss the sheet. Native arbitration isn't exercisable here, so just guard that the background isn't dropped.
  it('gives the explainer wrapper an opaque background so empty-space taps do not fall through to the backdrop', () => {
    render(<EarnHowItWorksModal initialAction={EarnAction.Deposit} isOpen vault={vault} onClose={vi.fn()} />)

    // Mobile RNTL maps to RTL, so this node is a DOM element at runtime despite the ReactTestInstance type.
    const content = screen.getByTestId('earn-how-it-works-sheet-content') as unknown as HTMLElement
    // Assert the wrapper's own authored `backgroundColor` token, not a styling-engine class name (see the
    // identical comment in EarnVaultModal.test.tsx): `getOwnStyleProp` reads it engine-agnostically, so this
    // fails iff the wrapper itself drops the background.
    expect(getOwnStyleProp(content, 'backgroundColor')).toBe('$surface1')
  })

  it.each([EarnPositionStatus.Loading, EarnPositionStatus.Error])(
    'drops the Acknowledged event while the position status is %s but still persists and continues',
    (unknownStatus) => {
      mockPositionStatus = unknownStatus

      const { store } = render(
        <EarnHowItWorksModal initialAction={EarnAction.Deposit} isOpen vault={vault} onClose={vi.fn()} />,
      )

      fireEvent.press(screen.getByTestId('continue-how-it-works'))

      expect(mockLogEarnHowItWorksAcknowledged).not.toHaveBeenCalled()
      expect(store.getState().uniswapBehaviorHistory.earnHowItWorksAcknowledgedByVaultId?.[vault.id]).toBe(true)
      expect(mockReplace).toHaveBeenCalledWith(ModalName.EarnDepositAmount, expect.objectContaining({ vault }))
    },
  )
})
