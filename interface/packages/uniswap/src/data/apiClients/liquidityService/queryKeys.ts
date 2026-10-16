import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

/** Key prefix matching every getWalletPositions query, for cache-wide refetch/invalidate. */
export const WALLET_POSITIONS_QUERY_KEY_PREFIX = [ReactQueryCacheKey.LiquidityService, 'getWalletPositions'] as const
