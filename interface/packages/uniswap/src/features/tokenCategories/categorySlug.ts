import type { TokenCategory } from 'uniswap/src/features/tokenCategories/types'

/**
 * Backend category ids are URL-safe slugs ('top-gainers', 'recently-launched') and are the
 * canonical deep-link form.
 */
export function findTokenCategoryBySlug({
  categories,
  slug,
}: {
  categories: TokenCategory[] | undefined
  slug: string | undefined
}): TokenCategory | undefined {
  if (!slug) {
    return undefined
  }
  const normalizedSlug = slug.toLowerCase()
  return categories?.find((category) => category.id.toLowerCase() === normalizedSlug)
}
