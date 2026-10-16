import { act, fireEvent } from '@testing-library/react'
import { isDevEnv } from '@universe/environment'
import { Accordion } from '@universe/mycelium'
import { DevImpersonateWallet } from 'src/app/features/settings/DevImpersonateWallet'
import { renderWithProviders } from 'src/test/render'
import { initialWalletState } from 'wallet/src/features/wallet/slice'
import { ACCOUNT } from 'wallet/src/test/fixtures'
import { readOnlyAccount } from 'wallet/src/test/fixtures/wallet/accounts'

vi.mock('@universe/environment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@universe/environment')>()),
  isDevEnv: vi.fn(() => true),
}))

const IMPERSONATED = readOnlyAccount({ address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' })

beforeEach(() => {
  vi.mocked(isDevEnv).mockReturnValue(true)
})

function renderSection(activeAccountAddress: string, extraAccounts = {}) {
  return renderWithProviders(
    <Accordion collapsible type="single" defaultValue="impersonate-wallet">
      <DevImpersonateWallet />
    </Accordion>,
    {
      preloadedState: {
        wallet: {
          ...initialWalletState,
          accounts: { [ACCOUNT.address]: ACCOUNT, ...extraAccounts },
          activeAccountAddress,
        },
      },
    },
  )
}

describe('DevImpersonateWallet', () => {
  it('offers the address input when not impersonating', () => {
    const { queryByPlaceholderText, queryByText } = renderSection(ACCOUNT.address)

    expect(queryByPlaceholderText('0x… / vitalik.eth / unitag')).toBeTruthy()
    expect(queryByText('Stop impersonating')).toBeNull()
  })

  it('renders nothing outside a dev build, whatever mounts it', () => {
    vi.mocked(isDevEnv).mockReturnValue(false)

    const { queryByPlaceholderText, queryByText } = renderSection(ACCOUNT.address)

    expect(queryByPlaceholderText('0x… / vitalik.eth / unitag')).toBeNull()
    expect(queryByText('Stop impersonating')).toBeNull()
  })

  it('collapses and re-expands from the trigger', async () => {
    const { getByText, queryByPlaceholderText } = renderSection(ACCOUNT.address)
    expect(queryByPlaceholderText('0x… / vitalik.eth / unitag')).toBeTruthy()

    await act(async () => {
      fireEvent.click(getByText('🕵️ Impersonate wallet'))
    })
    expect(queryByPlaceholderText('0x… / vitalik.eth / unitag')).toBeNull()

    await act(async () => {
      fireEvent.click(getByText('🕵️ Impersonate wallet'))
    })
    expect(queryByPlaceholderText('0x… / vitalik.eth / unitag')).toBeTruthy()
  })

  it('offers a way out when already impersonating', () => {
    const { queryByText, queryByPlaceholderText } = renderSection(IMPERSONATED.address, {
      [IMPERSONATED.address]: IMPERSONATED,
    })

    expect(queryByText('Stop impersonating')).toBeTruthy()
    expect(queryByPlaceholderText('0x… / vitalik.eth / unitag')).toBeNull()
  })
})
