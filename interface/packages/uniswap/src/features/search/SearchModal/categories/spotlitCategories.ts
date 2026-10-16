import type { TokenCategory } from 'uniswap/src/features/tokenCategories/types'

export function getSpotlitCategorySectionId(categoryId: string): string {
  return `category-${categoryId}`
}

/** Config order wins; ids the backend doesn't know are dropped so a stale entry can't blank the shelf. */
export function resolveSpotlitCategories({
  spotlitCategoryIds,
  categories,
}: {
  spotlitCategoryIds: string[]
  categories: TokenCategory[]
}): TokenCategory[] {
  const seen = new Set<string>()
  const resolved: TokenCategory[] = []
  for (const id of spotlitCategoryIds) {
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    const category = categories.find((candidate) => candidate.id === id)
    if (category) {
      resolved.push(category)
    }
  }
  return resolved
}
