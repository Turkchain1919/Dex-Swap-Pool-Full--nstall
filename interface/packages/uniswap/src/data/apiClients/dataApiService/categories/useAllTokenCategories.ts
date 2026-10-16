import { useListCategoriesQuery } from 'uniswap/src/data/apiClients/dataApiService/categories/useListCategoriesQuery'
import type { TokenCategory } from 'uniswap/src/features/tokenCategories/types'

const EMPTY_CATEGORIES: TokenCategory[] = []

/** Every known category from the cached ListCategories response, in its (BE canonical) order. */
export function useAllTokenCategories(): { categories: TokenCategory[]; isLoading: boolean } {
  const { data, isLoading } = useListCategoriesQuery()
  return { categories: data ?? EMPTY_CATEGORIES, isLoading }
}
