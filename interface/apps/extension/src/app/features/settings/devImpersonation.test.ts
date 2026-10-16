import { configureStore } from '@reduxjs/toolkit'
import { startImpersonating, stopImpersonating } from 'src/app/features/settings/devImpersonation'
import { AccountType } from 'uniswap/src/features/accounts/types'
import { initialWalletState, setAccountAsActive, walletReducer } from 'wallet/src/features/wallet/slice'
import { ACCOUNT, ACCOUNT2 } from 'wallet/src/test/fixtures'

// Lowercase on purpose: impersonation should work from a non-checksummed address.
const IMPERSONATED = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
const IMPERSONATED_CHECKSUMMED = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const OTHER_IMPERSONATED = '0xab5801a7d398351b8be11c439e05c5b3259aec9b'

function setupStore() {
  return configureStore({
    reducer: { wallet: walletReducer },
    preloadedState: {
      wallet: {
        ...initialWalletState,
        accounts: { [ACCOUNT.address]: ACCOUNT, [ACCOUNT2.address]: ACCOUNT2 },
        activeAccountAddress: ACCOUNT2.address,
      },
    },
  })
}

describe('devImpersonation', () => {
  it('adds the impersonated address as a view-only account and activates it', () => {
    const store = setupStore()

    const { address } = startImpersonating({ dispatch: store.dispatch, address: IMPERSONATED })

    expect(address).toBe(IMPERSONATED_CHECKSUMMED)
    const { accounts, activeAccountAddress } = store.getState().wallet
    expect(activeAccountAddress).toBe(IMPERSONATED_CHECKSUMMED)
    expect(accounts[IMPERSONATED_CHECKSUMMED]?.type).toBe(AccountType.Readonly)
    // The real wallets are left untouched.
    expect(accounts[ACCOUNT.address]).toEqual(ACCOUNT)
    expect(accounts[ACCOUNT2.address]).toEqual(ACCOUNT2)
  })

  it('restores the previously active account and removes the impersonated one on stop', () => {
    const store = setupStore()
    const { address } = startImpersonating({ dispatch: store.dispatch, address: IMPERSONATED })

    stopImpersonating({ dispatch: store.dispatch, impersonatedAddresses: [address], restoreAddress: ACCOUNT2.address })

    const { accounts, activeAccountAddress } = store.getState().wallet
    expect(activeAccountAddress).toBe(ACCOUNT2.address)
    expect(accounts[IMPERSONATED_CHECKSUMMED]).toBeUndefined()
    expect(Object.keys(accounts)).toHaveLength(2)
  })

  it('falls back to a remaining account when there is no address to restore', () => {
    const store = setupStore()
    const { address } = startImpersonating({ dispatch: store.dispatch, address: IMPERSONATED })

    stopImpersonating({ dispatch: store.dispatch, impersonatedAddresses: [address] })

    const { accounts, activeAccountAddress } = store.getState().wallet
    expect(accounts[IMPERSONATED_CHECKSUMMED]).toBeUndefined()
    expect(activeAccountAddress).not.toBeNull()
    expect(activeAccountAddress && accounts[activeAccountAddress]).toBeDefined()
  })

  it('throws instead of impersonating an invalid address', () => {
    const store = setupStore()

    expect(() => startImpersonating({ dispatch: store.dispatch, address: 'not-an-address' })).toThrow()
    expect(store.getState().wallet.activeAccountAddress).toBe(ACCOUNT2.address)
  })
})

describe('stopImpersonating cleanup', () => {
  it('also removes view-only accounts stranded by switching wallets instead of stopping', () => {
    const store = setupStore()
    const first = startImpersonating({ dispatch: store.dispatch, address: IMPERSONATED })
    // Simulates leaving impersonation through the account switcher, then impersonating again.
    store.dispatch(setAccountAsActive(ACCOUNT.address))
    const second = startImpersonating({ dispatch: store.dispatch, address: OTHER_IMPERSONATED })

    stopImpersonating({
      dispatch: store.dispatch,
      impersonatedAddresses: [first.address, second.address],
      restoreAddress: ACCOUNT.address,
    })

    const { accounts, activeAccountAddress } = store.getState().wallet
    expect(Object.keys(accounts)).toEqual([ACCOUNT.address, ACCOUNT2.address])
    expect(activeAccountAddress).toBe(ACCOUNT.address)
  })
})
