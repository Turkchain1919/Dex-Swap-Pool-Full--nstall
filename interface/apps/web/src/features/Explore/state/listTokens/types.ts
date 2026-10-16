import type { RankedMultichainToken } from '@uniswap/client-data-api/dist/data/v2/types_pb'
import { TokenSortMethod } from '~/components/Tokens/constants'
import type { SparklineMap } from '~/data/types'
import { TimePeriod, type PricePoint } from '~/data/util'

export interface RankedMultichainTokensResult {
  multichainTokens: RankedMultichainToken[]
  /** multichainId → 1d price history, from RankedMultichainToken.sparkline (backend) or stat.priceHistory (legacy). */
  priceHistoryByMultichainId: Partial<Record<string, PricePoint[]>>
}

/** Result shape returned by useListTokens (adds explore-specific sparklines). */
export interface UseListTokensResult {
  topTokens: RankedMultichainToken[]
  /** multichainId → 1-based rank in backend order. */
  tokenSortRank: Record<string, number>
  priceHistoryByMultichainId: Partial<Record<string, PricePoint[]>>
  isLoading: boolean
  isError: boolean
  loadMore: ((params: { onComplete?: () => void }) => void) | undefined
  hasNextPage: boolean
  isFetchingNextPage: boolean
  sparklines: SparklineMap
}

/** Optional flat options for top tokens. When provided, used instead of Explore filter store (e.g. for TDP carousel). */
export type UseListTokensOptions = {
  sortMethod?: TokenSortMethod
  sortAscending?: boolean
  filterString?: string
  filterTimePeriod?: TimePeriod
  categoryId?: string
}

export type UseListTokensSortOptions = Required<Pick<UseListTokensOptions, 'sortMethod' | 'sortAscending'>>

const DEFAULT_OPTIONS: Required<UseListTokensOptions> = {
  sortMethod: TokenSortMethod.VOLUME,
  sortAscending: false,
  filterString: '',
  filterTimePeriod: TimePeriod.DAY,
  categoryId: '',
}

// Per field rather than a spread: callers pass optional props straight through (TopTokensTable's
// categoryId), and a spread would copy that explicit `undefined` over the default, belying the
// Required<> return type wherever a field is dereferenced.
export function getEffectiveListTokensOptions(options?: UseListTokensOptions): Required<UseListTokensOptions> {
  return {
    sortMethod: options?.sortMethod ?? DEFAULT_OPTIONS.sortMethod,
    sortAscending: options?.sortAscending ?? DEFAULT_OPTIONS.sortAscending,
    filterString: options?.filterString ?? DEFAULT_OPTIONS.filterString,
    filterTimePeriod: options?.filterTimePeriod ?? DEFAULT_OPTIONS.filterTimePeriod,
    categoryId: options?.categoryId ?? DEFAULT_OPTIONS.categoryId,
  }
}
