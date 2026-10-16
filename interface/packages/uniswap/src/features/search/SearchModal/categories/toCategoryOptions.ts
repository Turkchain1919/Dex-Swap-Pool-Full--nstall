import { type CategoryOption, OnchainItemListOptionType } from 'uniswap/src/components/lists/items/types'
import type { TokenCategory } from 'uniswap/src/features/tokenCategories/types'

/**
 * Hydrates search-matched category ids into rows, preserving the BE's order. Ids missing from
 * ListCategories (e.g. the list is still loading, or the id is unknown to this client) are dropped.
 */
export function toCategoryOptions({
  categoryIds,
  categories,
}: {
  categoryIds: string[] | undefined
  categories: TokenCategory[]
}): CategoryOption[] {
  if (!categoryIds?.length || !categories.length) {
    return []
  }
  const byId = new Map(categories.map((category) => [category.id, category]))
  return categoryIds.flatMap((id) => {
    const category = byId.get(id)
    return category ? [{ type: OnchainItemListOptionType.Category, category }] : []
  })
}
