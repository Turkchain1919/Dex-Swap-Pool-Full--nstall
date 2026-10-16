import { PlainMessage, toPlainMessage } from '@bufbuild/protobuf'
import { skipToken, type UseQueryResult, useQuery } from '@tanstack/react-query'
import { CanClaimUsernameRequest, CanClaimUsernameResponse, type UseQueryApiHelperHookArgs } from '@universe/api'
import { unitagsApiClient } from 'uniswap/src/data/apiClients/unitagsApi/UnitagsApiClient'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'
import { persistableQueryOptions } from 'utilities/src/reactQuery/persistableQueryOptions'
import { ONE_MINUTE_MS } from 'utilities/src/time/time'

/** Single source of truth for the claim-eligibility cache key and value shape. */
export function getUnitagsClaimEligibilityQueryOptions(
  params: PlainMessage<CanClaimUsernameRequest>,
): ReturnType<typeof persistableQueryOptions<PlainMessage<CanClaimUsernameResponse>>> {
  return buildClaimEligibilityQueryOptions(params)
}

// Only the hook below may omit params (it pairs the keyed query with `skipToken`); requiring them
// on the exported factory keeps imperative callers off the throw at compile time.
function buildClaimEligibilityQueryOptions(
  params: PlainMessage<CanClaimUsernameRequest> | undefined,
): ReturnType<typeof persistableQueryOptions<PlainMessage<CanClaimUsernameResponse>>> {
  return persistableQueryOptions<PlainMessage<CanClaimUsernameResponse>>({
    queryKey: [ReactQueryCacheKey.UnitagsApi, 'claim/eligibility', params],
    // toPlainMessage strips the Message prototype so the value survives disk persistence.
    queryFn: async (): Promise<PlainMessage<CanClaimUsernameResponse>> => {
      if (!params) {
        throw new Error('params required')
      }
      const response = await unitagsApiClient.fetchClaimEligibility(params)
      return toPlainMessage(
        new CanClaimUsernameResponse({
          canClaim: response.canClaim,
          errorCode: response.errorCode,
        }),
      )
    },
    staleTime: 2 * ONE_MINUTE_MS,
  })
}

export function useUnitagsClaimEligibilityQuery({
  params,
  ...rest
}: UseQueryApiHelperHookArgs<
  PlainMessage<CanClaimUsernameRequest>,
  PlainMessage<CanClaimUsernameResponse>
>): UseQueryResult<PlainMessage<CanClaimUsernameResponse>> {
  const options = buildClaimEligibilityQueryOptions(params)

  return useQuery({
    ...options,
    queryFn: params ? options.queryFn : skipToken,
    ...rest,
    // Caller-provided meta must not clobber the persistence opt-in.
    meta: { ...options.meta, ...rest.meta, persist: true },
  })
}
