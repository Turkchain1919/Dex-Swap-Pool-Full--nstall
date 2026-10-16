import { Dispatch } from 'redux'
import {
  removeAllDappConnectionsForAccount,
  saveDappConnection,
  updateDappConnectedAddressFromExtension,
} from 'src/app/features/dapp/actions'
import { dappStore } from 'src/app/features/dapp/store'
import { createViewOnlyAccount } from 'wallet/src/features/onboarding/createViewOnlyAccount'
import { Account, ReadOnlyAccount } from 'wallet/src/features/wallet/accounts/types'
import { addAccount, removeAccounts, setAccountAsActive } from 'wallet/src/features/wallet/slice'

/**
 * Dev-only: imports `address` as a view-only account and makes it active, so the app renders as if
 * it were the user's own wallet. Signing stays blocked by the existing view-only account checks.
 *
 * @returns the view-only account now being impersonated
 */
export function startImpersonating({ dispatch, address }: { dispatch: Dispatch; address: string }): ReadOnlyAccount {
  const account = createViewOnlyAccount(address)
  dispatch(addAccount(account))
  dispatch(setAccountAsActive(account.address))
  return account
}

/**
 * Dev-only: drops impersonated view-only accounts so they don't linger in the account list.
 *
 * `restoreAddress` is activated *before* the removal, since removing the active account otherwise
 * leaves whichever account happens to be first in state active. It must be an address that still
 * exists in wallet state — `setAccountAsActive` throws for a missing one.
 */
export function stopImpersonating({
  dispatch,
  impersonatedAddresses,
  restoreAddress,
}: {
  dispatch: Dispatch
  impersonatedAddresses: Address[]
  restoreAddress?: Address
}): void {
  if (restoreAddress) {
    dispatch(setAccountAsActive(restoreAddress))
  }
  dispatch(removeAccounts(impersonatedAddresses))
}

/**
 * Dev-only: swaps the impersonated account into every dapp `previousAddress` was connected to, so
 * already-open dapps get an `accountsChanged` event and start treating it as the connected wallet.
 * Without this, impersonation would only change what the extension itself displays.
 *
 * Every dapp is attempted even if one fails, so a single bad update can't leave the rest silently
 * split between two addresses; the failures are then reported together.
 */
export async function connectImpersonatedAccountToDapps({
  account,
  previousAddress,
}: {
  account: ReadOnlyAccount
  previousAddress?: Address
}): Promise<void> {
  if (!previousAddress) {
    return
  }
  const dappUrls = dappStore.getConnectedDapps(previousAddress)
  const results = await Promise.allSettled(dappUrls.map((dappUrl) => saveDappConnection({ dappUrl, account })))
  assertAllSettled(results, 'connect dapps to the impersonated wallet')
}

/**
 * Dev-only: the inverse of {@link connectImpersonatedAccountToDapps} — drops every dapp connection
 * belonging to the impersonated accounts and points the dapps back at `restoreAddress`.
 *
 * Removing an account already falls a dapp's active address back to a remaining connected account,
 * so the real wallet stays connected; the explicit restore additionally re-selects it as active.
 */
export async function restoreDappsFromImpersonatedAccounts({
  accounts,
  restoreAddress,
}: {
  accounts: Account[]
  restoreAddress?: Address
}): Promise<void> {
  const results = await Promise.allSettled(accounts.map((account) => removeAllDappConnectionsForAccount(account)))
  assertAllSettled(results, 'disconnect dapps from the impersonated wallet')

  if (restoreAddress) {
    await updateDappConnectedAddressFromExtension(restoreAddress)
  }
}

function assertAllSettled(results: PromiseSettledResult<unknown>[], action: string): void {
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failures.length) {
    throw new Error(
      `Failed to ${action} for ${failures.length} of ${results.length} dapps: ${failures
        .map((failure) => (failure.reason instanceof Error ? failure.reason.message : String(failure.reason)))
        .join('; ')}`,
    )
  }
}
