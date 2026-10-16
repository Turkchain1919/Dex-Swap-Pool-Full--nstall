import type { ReactNode } from 'react'
import { EarnVaultModal } from 'src/components/earn/EarnVaultModal'
import { fireEvent, getOwnStyleProp, render, screen } from 'src/test/test-utils'
import { AccountType } from 'uniswap/src/features/accounts/types'
import {
  EarnAction,
  type EarnPositionInfo,
  type EarnVaultInfo,
  type EarnVaultTab,
} from 'uniswap/src/features/earn/types'
import { ModalName } from 'uniswap/src/features/telemetry/constants'

const mockNavigate = vi.fn()
const mockReplace = vi.fn()
const modalPropsSpy = vi.fn()
let mockActiveAccountType: AccountType

vi.mock('src/app/navigation/types', () => ({
  useAppStackNavigation: () => ({ navigate: mockNavigate, replace: mockReplace }),
}))

vi.mock('uniswap/src/components/modals/Modal', () => ({
  Modal: (props: { children: ReactNode }) => {
    modalPropsSpy(props)
    return props.children
  },
}))

vi.mock('@gorhom/bottom-sheet', async () => {
  const { Flex } = await vi.importActual<typeof import('@universe/mycelium')>('@universe/mycelium')
  return {
    BottomSheetScrollView: ({ children }: { children: ReactNode }) => (
      <Flex testID="earn-vault-scroll-view">{children}</Flex>
    ),
  }
})

vi.mock('uniswap/src/features/earn/EarnVaultOverview', async () => {
  const { Text } = await vi.importActual<typeof import('@universe/mycelium')>('@universe/mycelium')
  return {
    EarnVaultOverview: ({
      selectedTab,
      showActionButtons,
      onDeposit,
      onWithdraw,
    }: {
      selectedTab: EarnVaultTab
      showActionButtons: boolean
      onDeposit: () => void
      onWithdraw: () => void
    }) => (
      <>
        <Text testID="vault-overview-state">{`${selectedTab}:${showActionButtons}`}</Text>
        <Text testID="deposit" onPress={onDeposit}>
          Deposit
        </Text>
        <Text testID="withdraw" onPress={onWithdraw}>
          Withdraw
        </Text>
      </>
    ),
  }
})

vi.mock('uniswap/src/features/earn/hooks/useEarnDepositSources', () => ({
  useEarnDepositSources: () => ({ balanceLookupSettled: true, hasSupportedBalanceForUnderlying: true }),
}))

const position = {
  vaultId: 'vault-id',
  depositedRaw: '1',
  sharesRaw: '1',
} as EarnPositionInfo

vi.mock('uniswap/src/features/earn/hooks/useEarnPosition', () => ({
  useEarnPosition: () => ({ position, isError: false, refetch: vi.fn() }),
}))

vi.mock('uniswap/src/features/tokens/useCurrencyInfo', () => ({
  useCurrencyInfo: () => undefined,
}))

vi.mock('wallet/src/features/wallet/hooks', () => ({
  useActiveAccount: () => ({
    address: '0x0000000000000000000000000000000000000001',
    type: mockActiveAccountType,
  }),
  useIsViewOnlyWallet: (): boolean => mockActiveAccountType === AccountType.Readonly,
}))

const vault = { id: 'vault-id' } as EarnVaultInfo

describe(EarnVaultModal, () => {
  beforeEach(() => {
    mockActiveAccountType = AccountType.SignerMnemonic
    mockNavigate.mockClear()
    mockReplace.mockClear()
    modalPropsSpy.mockClear()
  })

  it('renders the overview inside a scroll view so long content scrolls', () => {
    render(<EarnVaultModal isOpen position={position} vault={vault} onClose={vi.fn()} />)

    expect(screen.getByTestId('earn-vault-scroll-view')).toBeDefined()
    expect(modalPropsSpy).toHaveBeenCalledWith(expect.objectContaining({ overrideInnerContainer: true }))
  })

  it('passes no content panning prop, leaving the shared derivation to turn it off for this shape', () => {
    render(<EarnVaultModal isOpen position={position} vault={vault} onClose={vi.fn()} />)

    expect(modalPropsSpy.mock.calls[0]?.[0]).not.toHaveProperty('enableContentPanningGesture')
  })

  // CONS-2919: the wrapper's opaque background makes it an RNGH touch target on Android so empty-space taps don't
  // dismiss the sheet. Native arbitration isn't exercisable here, so just guard that the background isn't dropped.
  it('gives the overview wrapper an opaque background so empty-space taps do not fall through to the backdrop', () => {
    render(<EarnVaultModal isOpen position={position} vault={vault} onClose={vi.fn()} />)

    const content = screen.getByTestId('earn-vault-sheet-content')
    // Assert the wrapper's own authored `backgroundColor` token, not a styling-engine class name:
    // Tamagui compiles backgroundColor="$surface1" to `_backgroundColor-surface1` while mycelium's
    // FlexCompat emits a `bg-surface1` Tailwind class, so pinning either class name would break the
    // moment this file swaps styling engines. The `$surface1` token prop is byte-identical across that
    // swap, and getComputedStyle/the resolved style object are both empty in this jsdom, so the fiber
    // prop is what proves the background. `getOwnStyleProp` reads it engine-agnostically — Tamagui
    // carries it on the first composite above the host, mycelium on the second (its FlexCompat sits
    // above an inserted react-native-web View) — while stopping at the wrapper's own styling primitive,
    // so this fails iff the wrapper itself drops the background and no ancestor can vacuously satisfy it.
    expect(getOwnStyleProp(content, 'backgroundColor')).toBe('$surface1')
  })

  it('opens on Details without action buttons for the amount info flow', () => {
    render(
      <EarnVaultModal
        initialSelectedTab="details"
        isInfoOnly
        isOpen
        position={position}
        vault={vault}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('details:false')).toBeDefined()
  })

  it('keeps the default balance view and actions for normal vault entry', () => {
    render(<EarnVaultModal isOpen position={position} vault={vault} onClose={vi.fn()} />)

    expect(screen.getByText('balance:true')).toBeDefined()
  })

  it('passes the displayed position into the deposit amount route', () => {
    render(<EarnVaultModal isOpen position={position} vault={vault} onClose={vi.fn()} />)

    fireEvent.press(screen.getByTestId('deposit'))

    expect(mockReplace).toHaveBeenCalledWith(ModalName.EarnDepositAmount, {
      analyticsEntryPoint: undefined,
      vault,
      position,
      initialAction: EarnAction.Deposit,
    })
  })

  it('shows the view-only explainer instead of the deposit flow for a view-only wallet', () => {
    mockActiveAccountType = AccountType.Readonly

    render(<EarnVaultModal isOpen position={position} vault={vault} onClose={vi.fn()} />)

    fireEvent.press(screen.getByTestId('deposit'))

    expect(mockNavigate).toHaveBeenCalledWith(ModalName.ViewOnlyExplainer)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('shows the view-only explainer instead of the withdraw flow for a view-only wallet', () => {
    mockActiveAccountType = AccountType.Readonly

    render(<EarnVaultModal isOpen position={position} vault={vault} onClose={vi.fn()} />)

    fireEvent.press(screen.getByTestId('withdraw'))

    expect(mockNavigate).toHaveBeenCalledWith(ModalName.ViewOnlyExplainer)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('routes a signer wallet withdraw into the withdraw amount flow', () => {
    render(<EarnVaultModal isOpen position={position} vault={vault} onClose={vi.fn()} />)

    fireEvent.press(screen.getByTestId('withdraw'))

    expect(mockReplace).toHaveBeenCalledWith(ModalName.EarnDepositAmount, {
      analyticsEntryPoint: undefined,
      vault,
      position,
      initialAction: EarnAction.Withdraw,
    })
  })
})
