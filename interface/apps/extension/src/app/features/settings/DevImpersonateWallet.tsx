import { Platform, areAddressesEqual, getValidAddress } from '@universe/chains'
import { isDevEnv } from '@universe/environment'
import { Flex, Text } from '@universe/mycelium'
import { Accordion } from '@universe/mycelium'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import {
  connectImpersonatedAccountToDapps,
  restoreDappsFromImpersonatedAccounts,
  startImpersonating,
  stopImpersonating,
} from 'src/app/features/settings/devImpersonation'
import { useImpersonationStore } from 'src/app/features/settings/stores/impersonationStore'
import { GatingButton } from 'uniswap/src/components/gating/GatingButton'
import { AccordionHeader } from 'uniswap/src/components/gating/GatingOverrides'
import { TextInput } from 'uniswap/src/components/input/TextInput'
import { useUnitagsUsernameQuery } from 'uniswap/src/data/apiClients/unitagsApi/useUnitagsUsernameQuery'
import { AccountType } from 'uniswap/src/features/accounts/types'
import { useENS } from 'uniswap/src/features/ens/useENS'
import { logger } from 'utilities/src/logger/logger'
import { normalizeTextInput } from 'utilities/src/primitives/string'
import { useEvent } from 'utilities/src/react/hooks'
import { useDebounceWithStatus } from 'utilities/src/time/timing'
import { useAccounts, useActiveAccount, useSignerAccounts, useViewOnlyAccounts } from 'wallet/src/features/wallet/hooks'

/**
 * Dev-only tool to view the app as any wallet: imports the address as a view-only account and makes
 * it active. Rendered from the Developer Settings screen, which is itself dev-gated.
 */
export function DevImpersonateWallet(): JSX.Element | null {
  const dispatch = useDispatch()
  const accounts = useAccounts()
  const signerAccounts = useSignerAccounts()
  const viewOnlyAccounts = useViewOnlyAccounts()
  const activeAccount = useActiveAccount()
  const previousActiveAddress = useImpersonationStore((s) => s.previousActiveAddress)
  const setPreviousActiveAddress = useImpersonationStore((s) => s.actions.setPreviousActiveAddress)

  const [input, setInput] = useState('')
  const [actionError, setActionError] = useState<string>()

  const { address: resolvedAddress, loading, error: resolutionError } = useResolvedAddress(input)

  // The extension can only produce a view-only account through this tool, so an active one always
  // means impersonation. Deriving it from state rather than from the store keeps an exit available
  // after a sidebar reload, when the in-memory store no longer remembers the session.
  const isImpersonating = activeAccount?.type === AccountType.Readonly

  const onImpersonate = useEvent(async (): Promise<void> => {
    if (!resolvedAddress) {
      return
    }
    const previousAddress = activeAccount?.address

    let account
    try {
      account = startImpersonating({ dispatch, address: resolvedAddress })
      // Recorded only once the account exists, so a failed start leaves no stale restore target.
      setPreviousActiveAddress(previousAddress ?? null)
      setInput('')
      setActionError(undefined)
    } catch (e) {
      logger.error(e, { tags: { file: 'DevImpersonateWallet', function: 'onImpersonate' } })
      setActionError(`Could not impersonate that wallet: ${e instanceof Error ? e.message : 'unknown error'}`)
      return
    }

    // Reported separately from the failure above: by this point the wallet *is* impersonated, and
    // only the dapp handover was partial. Saying "could not impersonate" here would describe the
    // opposite of the state the user is now in.
    try {
      await connectImpersonatedAccountToDapps({ account, previousAddress })
    } catch (e) {
      logger.error(e, { tags: { file: 'DevImpersonateWallet', function: 'onImpersonate' } })
      setActionError(
        `Impersonating, but some dapps kept your previous wallet: ${e instanceof Error ? e.message : 'unknown error'}. Stop impersonating and start again to retry.`,
      )
    }
  })

  const onStopImpersonating = useEvent(async (): Promise<void> => {
    // Every view-only account is an artifact of this tool, so this also clears any stranded by
    // leaving impersonation through the account switcher instead of stopping here.
    if (!viewOnlyAccounts.length) {
      return
    }
    // Only restore an address that still exists, since activating a missing account throws.
    const restoreAddress =
      previousActiveAddress && accounts[previousActiveAddress] ? previousActiveAddress : signerAccounts[0]?.address

    try {
      // Dapps are moved back before the accounts are gone, while the store still knows what they
      // were connected to.
      await restoreDappsFromImpersonatedAccounts({ accounts: viewOnlyAccounts, restoreAddress })
    } catch (e) {
      logger.error(e, { tags: { file: 'DevImpersonateWallet', function: 'onStopImpersonating' } })
      // Wallet state is left impersonated on purpose: dropping the account here would leave open
      // dapps pointing at an address the extension no longer has. Retrying is safe.
      setActionError(
        `Could not move dapps back to your wallet: ${e instanceof Error ? e.message : 'unknown error'}. Still impersonating — try again.`,
      )
      return
    }

    stopImpersonating({
      dispatch,
      impersonatedAddresses: viewOnlyAccounts.map((account) => account.address),
      restoreAddress,
    })
    setPreviousActiveAddress(null)
    setActionError(undefined)
  })

  // Defense in depth: the Developer Settings entry is already dev-gated, but this component can
  // remove accounts, so it stays unreachable regardless of where it gets mounted.
  if (!isDevEnv()) {
    return null
  }

  const error = resolutionError ?? actionError

  return (
    <Flex>
      <Accordion.Item value="impersonate-wallet">
        <AccordionHeader title="🕵️ Impersonate wallet" />

        <Accordion.Content>
          {isImpersonating ? (
            <Flex gap="$spacing12">
              <Text variant="body3" color="$neutral2">
                Viewing the app as {activeAccount.address}. Signing is blocked while impersonating.
              </Text>
              {actionError && (
                <Text variant="body3" color="$statusCritical">
                  {actionError}
                </Text>
              )}
              <GatingButton onPress={onStopImpersonating}>Stop impersonating</GatingButton>
            </Flex>
          ) : (
            <Flex gap="$spacing12">
              <Text variant="body3" color="$neutral2">
                Imports an address as a view-only wallet and makes it active, so the app renders that wallet's balances
                and activity. Accepts an address, an ENS name, or a unitag.
              </Text>
              <TextInput
                autoCapitalize="none"
                placeholder="0x… / vitalik.eth / unitag"
                value={input}
                onChangeText={setInput}
              />
              {error && (
                <Text variant="body3" color="$statusCritical">
                  {error}
                </Text>
              )}
              <GatingButton disabled={!resolvedAddress} loading={loading} onPress={onImpersonate}>
                Impersonate
              </GatingButton>
            </Flex>
          )}
        </Accordion.Content>
      </Accordion.Item>
    </Flex>
  )
}

/** Resolves the input to an address, accepting a raw address, an ENS name, or a unitag. */
function useResolvedAddress(input: string): { address?: Address; loading: boolean; error?: string } {
  const accounts = useAccounts()
  // Debounced here rather than inside `useENS` so the unitag lookup and the "not found" message
  // wait for the same settled input, instead of firing on every keystroke.
  const [normalized, isDebouncing] = useDebounceWithStatus({ value: normalizeTextInput(input) })

  const validAddress =
    getValidAddress({ address: normalized, platform: Platform.EVM, withEVMChecksum: true, log: false }) ?? undefined
  const maybeName = validAddress ? null : normalized || null

  const { address: ensAddress, loading: ensLoading } = useENS({
    nameOrAddress: maybeName,
    autocompleteDomain: true,
    skipDebounce: true,
  })
  const { data: unitag, isLoading: unitagLoading } = useUnitagsUsernameQuery({
    params: maybeName ? { username: maybeName } : undefined,
  })

  const address = validAddress ?? unitag?.address ?? ensAddress ?? undefined
  const loading = !validAddress && !!maybeName && (isDebouncing || ensLoading || unitagLoading)

  if (!normalizeTextInput(input)) {
    return { loading: false }
  }
  if (loading || isDebouncing) {
    return { loading: true }
  }
  if (!address) {
    return { loading: false, error: 'Could not resolve that address, ENS name, or unitag' }
  }
  // Checked against every account, not just signer ones: stopping removes the impersonated account,
  // which must never be an account the user already had.
  const isExistingAccount = Object.values(accounts).some((account) =>
    areAddressesEqual({
      addressInput1: { address: account.address, platform: Platform.EVM },
      addressInput2: { address, platform: Platform.EVM },
    }),
  )
  if (isExistingAccount) {
    return { loading: false, error: 'That address is already one of your wallets' }
  }
  return { address, loading: false }
}
