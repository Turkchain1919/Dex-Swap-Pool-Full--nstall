import { UseMutationResult, useMutation } from '@tanstack/react-query'
import { logger } from 'utilities/src/logger/logger'
import { useEvent } from 'utilities/src/react/hooks'
import { InvalidPasswordError, unlockWallet } from 'wallet/src/features/auth/unlockWallet'

/**
 * Unlock lives in a mutation, not a redux saga, so the password never becomes an action payload.
 * Unlocked state itself is read from session storage by `useIsWalletUnlocked`.
 *
 * The password comes from the closure, not from `mutate`'s variables: react-query keeps
 * `state.variables` on the cached Mutation until gc (5 minutes by default), readable by anything
 * holding the QueryClient. With `void` variables the cache never sees the password.
 */
export function useUnlockWithPassword(password: string): UseMutationResult<void, Error, void> {
  const unlock = useEvent(() => unlockWallet({ password }))

  return useMutation({
    mutationFn: unlock,
    retry: false,
    // Local crypto only. 'online' would pause the mutation while offline, and paused mutations are
    // what react-query dehydrates into the persisted cache.
    networkMode: 'always',
    onError: (error) => {
      if (error instanceof InvalidPasswordError) {
        return
      }
      logger.error(error, { tags: { file: 'useUnlockWithPassword.ts', function: 'useUnlockWithPassword' } })
    },
  })
}
