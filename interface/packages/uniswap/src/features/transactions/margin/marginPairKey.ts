import { normalizeTokenAddressForCache } from '@universe/chains'
import type { MarginPairKey } from 'uniswap/src/features/transactions/margin/types'

// Role-ordered collateral→debt identity, NOT address-sorted: address-sorting would collapse a pair's
// long and its short into one key. Carries no venue — the server routes over the allowlist, so
// pinning one here would let form identity contradict the request it builds.
export function marginPairKey({
  collateralToken,
  debtToken,
}: {
  collateralToken: string
  debtToken: string
}): MarginPairKey {
  return `${normalizeTokenAddressForCache(collateralToken)}-${normalizeTokenAddressForCache(debtToken)}`
}
