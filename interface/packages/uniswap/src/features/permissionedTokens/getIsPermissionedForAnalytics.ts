import { SharedQueryClient } from '@universe/api'
import { getIsPermissionedStatusFromCache } from 'uniswap/src/data/apiClients/tradingApi/getIsPermissionedTokenFromCache'
import { NATIVE_ADDRESS_FOR_TRADING_API } from 'uniswap/src/features/transactions/swap/utils/tradingApi'

// Minimal currency shape so both sdk `Currency` objects and raw trading-API params can be passed.
type PermissionedAnalyticsToken = {
  chainId: number
  isNative: boolean
  address?: string
}

/**
 * `is_permissioned` analytics flag for the tokens of a swap/LP pair, read synchronously from the
 * cached `/permissions` results (`SharedQueryClient`). Emitted only when the cache has a resolved
 * answer, so `false` always means "checked and not permissioned":
 * - `true`: at least one token is confirmed permissioned — a pair with one permissioned side must
 *   route through the permissioned hook, so the pair-level flag is an OR over the tokens
 * - `false`: every token has a resolved answer and none is permissioned (natives can't be permissioned)
 * - `undefined` (property omitted): the cache can't answer yet, e.g. cold cache or a cross-chain
 *   pair whose permissions check was skipped
 *
 * Keyed on displayed token addresses only, never adapter addresses (see ECO-586).
 */
export function getIsPermissionedForAnalytics(tokens: (PermissionedAnalyticsToken | undefined)[]): boolean | undefined {
  if (tokens.length === 0) {
    return undefined
  }
  const statuses = tokens.map(getTokenStatus)
  if (statuses.some((status) => status === true)) {
    return true
  }
  return statuses.every((status) => status === false) ? false : undefined
}

/** Adapter for raw trading-API quote params, where natives are represented by the zero address. */
export function permissionedAnalyticsTokenFromQuoteParams({
  address,
  chainId,
}: {
  address: string | undefined
  chainId: number | undefined
}): PermissionedAnalyticsToken | undefined {
  if (!address || !chainId) {
    return undefined
  }
  return { address, chainId, isNative: address === NATIVE_ADDRESS_FOR_TRADING_API }
}

function getTokenStatus(token: PermissionedAnalyticsToken | undefined): boolean | undefined {
  if (!token) {
    return undefined
  }
  if (token.isNative) {
    return false
  }
  return getIsPermissionedStatusFromCache({
    queryClient: SharedQueryClient,
    tokenAddresses: [token.address],
    chainId: token.chainId,
  })
}
