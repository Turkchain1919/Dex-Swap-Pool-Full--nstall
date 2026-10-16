import { TransactionDetails, TransactionType } from 'uniswap/src/features/transactions/types/transactionDetails'
import { ActivityRowFragments } from '~/pages/Portfolio/Activity/ActivityTable/activityTableModels'

// Cache size set to 2x the maximum possible transactions (250) to handle refetches and scrolling.
const MAX_CACHE_SIZE = 500
const fragmentsCache = new Map<string, ActivityRowFragments>()

export function getCachedActivityRowFragments(details: TransactionDetails): ActivityRowFragments | undefined {
  return fragmentsCache.get(getTransactionCacheKey(details))
}

export function cacheActivityRowFragments({
  details,
  fragments,
}: {
  details: TransactionDetails
  fragments: ActivityRowFragments
}): void {
  if (fragmentsCache.size >= MAX_CACHE_SIZE) {
    const firstKey = fragmentsCache.keys().next().value

    if (typeof firstKey === 'string') {
      fragmentsCache.delete(firstKey)
    }
  }

  fragmentsCache.set(getTransactionCacheKey(details), fragments)
}

function getTransactionCacheKey(details: TransactionDetails): string {
  const updatedTime = 'updatedTime' in details ? details.updatedTime : undefined

  if (details.typeInfo.type === TransactionType.Plan) {
    return [
      details.chainId,
      details.id,
      details.status,
      updatedTime,
      details.typeInfo.planStatus,
      details.typeInfo.earnAction,
      details.typeInfo.inputCurrencyId,
      details.typeInfo.outputCurrencyId,
      details.typeInfo.inputCurrencyAmountRaw,
      details.typeInfo.outputCurrencyAmountRaw,
    ].join(':')
  }
  // Keep the trailing empty segment when updatedTime is undefined so key shape stays stable.
  return [details.chainId, details.id, details.status, updatedTime].join(':')
}
