import { ExtensionEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { Keyring } from 'wallet/src/features/wallet/Keyring/Keyring'

/** The password did not decrypt the vault. Expected on a typo, so callers should not log it. */
export class InvalidPasswordError extends Error {
  constructor() {
    super('Invalid password')
    this.name = 'InvalidPasswordError'
  }
}

/**
 * Unlocks the keyring with the user's password.
 *
 * Deliberately a plain async function, not a saga: a dispatched redux action reaches every
 * middleware, enhancer and telemetry sink (the Datadog enhancer mirrors action payloads to RUM),
 * so the password must never travel on one. Wrap in `useMutation` for loading and error state.
 */
export async function unlockWallet({ password }: { password: string }): Promise<void> {
  const success = await Keyring.unlock(password)
  if (!success) {
    throw new InvalidPasswordError()
  }
  sendAnalyticsEvent(ExtensionEventName.ChangeLockedState, { locked: false, location: 'sidebar' })
}
