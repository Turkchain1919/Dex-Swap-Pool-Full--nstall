import { ActivityScreen } from 'src/screens/ActivityScreen'
import { render } from 'src/test/test-utils'
import { initialNotificationsState } from 'uniswap/src/features/notifications/slice/slice'
import { ACCOUNT, preloadedWalletPackageState } from 'wallet/src/test/fixtures'

const mockUseIsFocused = vi.hoisted(() => vi.fn<() => boolean>())

vi.mock('@react-navigation/native', async () => ({
  ...(await vi.importActual('@react-navigation/native')),
  useIsFocused: mockUseIsFocused,
}))

// The activity list itself is irrelevant here and pulls in the whole data-fetching surface.
vi.mock('src/components/activity/ActivityContent', () => ({
  ActivityContent: () => null,
}))

const address = ACCOUNT.address

const preloadedState = {
  ...preloadedWalletPackageState({ account: ACCOUNT }),
  notifications: { ...initialNotificationsState, notificationStatus: { [address]: true } },
}

describe(ActivityScreen, () => {
  it('clears the notification indicator while focused', () => {
    mockUseIsFocused.mockReturnValue(true)

    const { store } = render(<ActivityScreen />, { preloadedState })

    expect(store.getState().notifications.notificationStatus[address]).toBe(false)
  })

  it('leaves the notification indicator alone while blurred', () => {
    // the tab stays mounted when blurred (freezeOnBlur:false), so the badge must survive
    mockUseIsFocused.mockReturnValue(false)

    const { store } = render(<ActivityScreen />, { preloadedState })

    expect(store.getState().notifications.notificationStatus[address]).toBe(true)
  })
})
