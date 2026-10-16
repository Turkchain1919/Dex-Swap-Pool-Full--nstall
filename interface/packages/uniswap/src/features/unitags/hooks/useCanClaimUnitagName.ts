import { areAddressesEqual, Platform } from '@universe/chains'
import { useTranslation } from 'react-i18next'
import { useUnitagsUsernameQuery } from 'uniswap/src/data/apiClients/unitagsApi/useUnitagsUsernameQuery'
import { useENS } from 'uniswap/src/features/ens/useENS'
import { UNITAG_VERIFICATION_DEBOUNCE_MS } from 'uniswap/src/features/unitags/constants'
import { getUnitagFormatError } from 'uniswap/src/features/unitags/getUnitagFormatError'
import { ONE_MINUTE_MS } from 'utilities/src/time/time'
import { useDebounceWithStatus } from 'utilities/src/time/timing'

/**
 * @param claimerAddress When set, a username that is "unavailable" only because it is already
 *   registered to this address is treated as valid (avoids false errors after a successful claim
 *   when the availability query refetches).
 * @param unavailableErrorMessage Overrides the default error copy for a taken username
 *   (format errors keep their standard messages).
 */
export const useCanClaimUnitagName = ({
  unitag,
  claimerAddress,
  unavailableErrorMessage,
}: {
  unitag: string | undefined
  claimerAddress?: string
  unavailableErrorMessage?: string
}): { error: string | undefined; loading: boolean; isDebouncing: boolean } => {
  const { t } = useTranslation()

  // Format errors are local, so they surface from the raw input without waiting for the debounce
  const formatError = unitag ? getUnitagFormatError(unitag, t) : undefined

  // Derive debouncing status directly from value equality rather than the hook's
  // internal `isDebouncing` flag: that flag flips inside a useEffect, so it lags
  // one render behind a value change. During that lagging render this hook would
  // otherwise read the *previous* debounced value's already-resolved query data as
  // if it applied to the newly-typed username — letting a taken username flash as
  // available before its own availability check has even started.
  const [debouncedUnitag] = useDebounceWithStatus({
    value: unitag,
    delay: UNITAG_VERIFICATION_DEBOUNCE_MS,
  })
  const isDebouncing = debouncedUnitag !== unitag

  const debouncedFormatError = debouncedUnitag ? getUnitagFormatError(debouncedUnitag, t) : undefined
  const unitagToSearch = debouncedFormatError ? undefined : debouncedUnitag

  const {
    isLoading: unitagLoading,
    isError: unitagQueryFailed,
    data,
  } = useUnitagsUsernameQuery({
    params: unitagToSearch ? { username: unitagToSearch } : undefined,
    staleTime: 2 * ONE_MINUTE_MS,
  })

  const { loading: ensLoading } = useENS({
    nameOrAddress: unitagToSearch,
    autocompleteDomain: true,
    skipDebounce: true,
  })
  const loading = unitagLoading || ensLoading

  if (formatError) {
    return { error: formatError, loading, isDebouncing }
  }

  if (!unitag || isDebouncing || loading) {
    return { error: undefined, loading, isDebouncing }
  }

  if (unitagQueryFailed) {
    return { error: t('unitags.claim.error.general'), loading, isDebouncing }
  }

  const usernameOwnedByClaimer =
    !!claimerAddress &&
    !!data?.address &&
    areAddressesEqual({
      addressInput1: { address: data.address, platform: Platform.EVM },
      addressInput2: { address: claimerAddress, platform: Platform.EVM },
    })

  if (data?.available === false && !usernameOwnedByClaimer) {
    return { error: unavailableErrorMessage ?? t('unitags.claim.error.unavailable'), loading, isDebouncing }
  }

  return { error: undefined, loading, isDebouncing }
}
