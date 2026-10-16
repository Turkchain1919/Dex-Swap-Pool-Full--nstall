import { TokenCategory } from 'uniswap/src/features/tokenCategories/types'

export function orderTokenCategories({
  categories,
  orderedCategoryIds,
}: {
  categories: TokenCategory[]
  orderedCategoryIds: string[]
}): TokenCategory[] {
  if (orderedCategoryIds.length === 0) {
    return categories
  }
  const categoriesById = new Map(categories.map((category) => [category.id, category]))
  const pinnedIds = new Set(orderedCategoryIds)
  const pinned = orderedCategoryIds
    .map((id) => categoriesById.get(id))
    .filter((category): category is TokenCategory => category !== undefined)
  const unpinned = categories.filter((category) => !pinnedIds.has(category.id))
  return [...pinned, ...unpinned]
}
