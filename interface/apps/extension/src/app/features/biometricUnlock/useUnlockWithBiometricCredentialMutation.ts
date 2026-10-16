import { UseMutationResult, useMutation } from '@tanstack/react-query'
import {
  authenticateWithBiometricCredential,
  decryptPasswordFromBiometricData,
} from 'src/app/features/biometricUnlock/biometricAuthUtils'
import { BiometricUnlockStorage } from 'src/app/features/biometricUnlock/BiometricUnlockStorage'
import { startNavigatorCredentialRequest } from 'src/app/features/biometricUnlock/useNavigatorCredentialAbortSignal'
import { logger } from 'utilities/src/logger/logger'
import { InvalidPasswordError, unlockWallet } from 'wallet/src/features/auth/unlockWallet'
import { Keyring } from 'wallet/src/features/wallet/Keyring/Keyring'

export function useUnlockWithBiometricCredentialMutation(): UseMutationResult<void, Error, void> {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { abortSignal } = startNavigatorCredentialRequest('New biometric unlock request initiated')
      const password = await getPasswordFromBiometricCredential(abortSignal)
      await unlockWallet({ password })
    },
    retry: false,
    networkMode: 'always',
    onError: (error) => {
      // A stale biometric secret after a password change; the lock screen renders it.
      if (error instanceof InvalidPasswordError) {
        return
      }
      logger.error(error, {
        tags: {
          file: 'useUnlockWithBiometricCredentialMutation.ts',
          function: 'unlockWithBiometric',
        },
      })
    },
  })
}

/**
 * Reauthenticates a user with their biometric credential.
 * Meant to be used when the Extension is already unlocked but we want to prompt the user to re-authenticate.
 * For example, when viewing the seed phrase or changing their password.
 *
 * @returns the user's password if authentication is successful, null otherwise.
 */
export async function reauthenticateWithBiometricCredential(): Promise<{ password: string | null }> {
  try {
    const { abortSignal } = startNavigatorCredentialRequest('New biometric reauthentication request initiated')
    const password = await getPasswordFromBiometricCredential(abortSignal)
    const success = await Keyring.checkPassword(password)
    return { password: success ? password : null }
  } catch {
    return { password: null }
  }
}

async function getPasswordFromBiometricCredential(abortSignal: AbortSignal): Promise<string> {
  const biometricUnlockCredential = await BiometricUnlockStorage.get()

  if (!biometricUnlockCredential) {
    throw new Error('No biometric unlock credential found')
  }

  const { credentialId, transports } = biometricUnlockCredential

  // Authenticate with WebAuthn using the stored credential and decrypt password
  const { encryptionKey } = await authenticateWithBiometricCredential({ credentialId, transports, abortSignal })
  const password = await decryptPasswordFromBiometricData({ encryptionKey, biometricUnlockCredential })
  return password
}
