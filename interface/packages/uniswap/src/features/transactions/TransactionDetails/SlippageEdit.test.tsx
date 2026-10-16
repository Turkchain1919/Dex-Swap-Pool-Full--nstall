import { fireEvent } from '@testing-library/react-native'
import { SlippageEdit } from 'uniswap/src/features/transactions/TransactionDetails/SlippageEdit'
import { ON_PRESS_EVENT_PAYLOAD } from 'uniswap/src/test/fixtures/events'
import { renderWithProviders } from 'uniswap/src/test/render'

// isWebApp toggles which branch renders (bare button vs. Popover.Trigger asChild); flip per test.
const mockPlatform = vi.hoisted(() => ({ isWebApp: true }))

vi.mock('@universe/environment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/environment')>()
  return {
    ...actual,
    get isWebApp(): boolean {
      return mockPlatform.isWebApp
    },
  }
})

const mockTransactionSettingsModal = vi.hoisted(() => vi.fn())

// Stub the modal itself; this test only cares that the Popover.Trigger asChild
// composition (the mycelium Button cloned as the trigger) opens it.
vi.mock(
  'uniswap/src/features/transactions/components/settings/TransactionSettingsModal/TransactionSettingsModal',
  () => ({
    TransactionSettingsModal: (props: { isOpen: boolean }): null => {
      mockTransactionSettingsModal(props)
      return null
    },
  }),
)

describe('SlippageEdit', () => {
  afterEach(() => {
    mockPlatform.isWebApp = true
    mockTransactionSettingsModal.mockClear()
  })

  it('opens the settings popover when the cloned trigger button is pressed on web', () => {
    const { getByText } = renderWithProviders(<SlippageEdit />)

    expect(mockTransactionSettingsModal).toHaveBeenCalledWith(expect.objectContaining({ isOpen: false }))

    fireEvent.press(getByText('common.button.edit'), ON_PRESS_EVENT_PAYLOAD)

    expect(mockTransactionSettingsModal).toHaveBeenCalledWith(expect.objectContaining({ isOpen: true }))
  })

  it('calls the wallet press handler directly on native, bypassing the popover', () => {
    mockPlatform.isWebApp = false
    const onWalletSlippageEditPress = vi.fn()
    const { getByText } = renderWithProviders(<SlippageEdit onWalletSlippageEditPress={onWalletSlippageEditPress} />)

    fireEvent.press(getByText('common.button.edit'), ON_PRESS_EVENT_PAYLOAD)

    expect(onWalletSlippageEditPress).toHaveBeenCalledTimes(1)
    expect(mockTransactionSettingsModal).not.toHaveBeenCalled()
  })
})
