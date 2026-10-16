import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UnitagErrorCode } from '@universe/api'
import { useCallback } from 'react'
import {
  getUnitagsClaimEligibilityQueryOptions,
  useUnitagsClaimEligibilityQuery,
} from 'uniswap/src/data/apiClients/unitagsApi/useUnitagsClaimEligibilityQuery'
import { uniqueIdQuery } from 'utilities/src/device/uniqueIdQuery'

export const useCanAddressClaimUnitag = (
  address?: Address,
  isUsernameChange?: boolean,
): { canClaimUnitag: boolean; errorCode?: UnitagErrorCode } => {
  const { data: deviceId } = useQuery(uniqueIdQuery())
  const skip = !deviceId

  const { isLoading, data } = useUnitagsClaimEligibilityQuery({
    params: skip
      ? undefined
      : {
          address,
          deviceId,
          isUsernameChange,
        },
  })

  return {
    canClaimUnitag: !isLoading && !!data?.canClaim,
    errorCode: data?.errorCode,
  }
}

type ClaimEligibilityParams = Parameters<typeof getUnitagsClaimEligibilityQueryOptions>[0]

/**
 * The params object is the cache key: warm and resolve must build it identically to share one
 * entry. Key hashing drops `undefined` props, so callers of the hook above that omit
 * `isUsernameChange` share it too.
 */
function buildClaimEligibilityParams(address: Address | undefined, deviceId: string): ClaimEligibilityParams {
  return { address, deviceId }
}

/**
 * Resolves claim eligibility on demand, for callers that branch navigation on it.
 *
 * `useCanAddressClaimUnitag` reports `false` while the answer is still in flight, so a press
 * handler reading it cannot tell "not eligible" from "no answer yet". The returned callback awaits
 * the real answer, joining the request this hook warms on mount.
 *
 * Aborting via `signal` cancels the shared query — including any other observer's in-flight fetch
 * on the same key.
 */
export function useResolveCanAddressClaimUnitag(address?: Address): (signal?: AbortSignal) => Promise<boolean> {
  const queryClient = useQueryClient()
  const { data: deviceId } = useQuery(uniqueIdQuery())

  // Warms the cache while the screen is idle so resolving on press usually needs no network.
  useUnitagsClaimEligibilityQuery({ params: deviceId ? buildClaimEligibilityParams(address, deviceId) : undefined })

  return useCallback(
    async (signal?: AbortSignal): Promise<boolean> => {
      const resolvedDeviceId = await queryClient.ensureQueryData(uniqueIdQuery())
      const options = getUnitagsClaimEligibilityQueryOptions(buildClaimEligibilityParams(address, resolvedDeviceId))
      const cancelQuery = (): Promise<void> => queryClient.cancelQueries({ queryKey: options.queryKey, exact: true })

      if (signal?.aborted) {
        await cancelQuery()
        throw new Error('Unitag eligibility resolution aborted')
      }

      let cancellationPromise: Promise<void> | undefined
      const onAbort = (): void => {
        cancellationPromise = cancelQuery()
      }
      signal?.addEventListener('abort', onAbort, { once: true })

      // `fetchQuery`, not `ensureQueryData`: stale persisted data must trigger a refetch (or join
      // the in-flight refresh) rather than be returned immediately.
      try {
        const { canClaim } = await queryClient.fetchQuery(options)
        return canClaim
      } finally {
        signal?.removeEventListener('abort', onAbort)
        if (cancellationPromise) {
          await cancellationPromise
        }
      }
    },
    [address, queryClient],
  )
}
