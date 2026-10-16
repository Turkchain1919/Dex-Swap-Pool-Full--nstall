import { providerErrors } from '@metamask/rpc-errors'
import { isDevEnv } from '@universe/environment'
import { AccountType } from 'uniswap/src/features/accounts/types'

/**
 * An impersonated wallet is a view-only account created by the dev-only "Impersonate wallet" setting.
 * The extension offers no other way to add a view-only account, and this is dev-gated on top of that,
 * so the carve-outs keyed off it cannot loosen behavior in a shipped build.
 */
export function isImpersonatedAccount(account: { type: AccountType } | undefined | null): boolean {
  return isDevEnv() && account?.type === AccountType.Readonly
}

export const IMPERSONATION_SIGNING_ERROR_MESSAGE =
  'This wallet is impersonated for development — there is no private key to sign with.'

/**
 * The point where dapp requests from an impersonated wallet stop. Thrown as an RPC error so the
 * dapp receives a standard `unauthorized` rejection rather than an opaque internal failure.
 */
export function impersonatedSigningError(): Error {
  return providerErrors.unauthorized({
    message: IMPERSONATION_SIGNING_ERROR_MESSAGE,
    data: { impersonatedWallet: true },
  })
}

export function isImpersonatedSigningError(error: unknown): boolean {
  // Dev-gated like `isImpersonatedAccount`, so the caller's error-report suppression can't be
  // reached in a shipped build by an unrelated error that happens to carry this marker.
  if (!isDevEnv() || typeof error !== 'object' || error === null || !('data' in error)) {
    return false
  }
  const { data } = error as { data?: { impersonatedWallet?: boolean } }
  return data?.impersonatedWallet === true
}
