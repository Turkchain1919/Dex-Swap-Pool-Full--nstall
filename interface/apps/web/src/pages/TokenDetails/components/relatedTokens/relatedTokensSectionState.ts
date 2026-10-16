import type { TFunction } from 'i18next'
import { getRelatedTokensTitle } from 'uniswap/src/features/tokenCategories/getRelatedTokensTitle'
import type { TokenCategory } from 'uniswap/src/features/tokenCategories/types'

export interface RelatedTokensSectionState {
  selectedCategory: TokenCategory
  showChips: boolean
  isListEmpty: boolean
  title: string
}

/** Falls back to the first category whenever the pick is stale (token changed, categories reordered). */
export function selectRelatedTokensCategory({
  categories,
  pickedCategoryId,
}: {
  categories: TokenCategory[]
  pickedCategoryId: string | undefined
}): TokenCategory | undefined {
  return categories.find((category) => category.id === pickedCategoryId) ?? categories.at(0)
}

/**
 * Keeps a chipped section mounted on an empty or failed category so the user can switch away, and
 * hides a chipless section with nothing to show.
 */
export function deriveRelatedTokensSectionState({
  categories,
  pickedCategoryId,
  isLoading,
  isError,
  tokenCount,
  t,
}: {
  categories: TokenCategory[]
  pickedCategoryId: string | undefined
  isLoading: boolean
  isError: boolean
  tokenCount: number
  t: TFunction
}): RelatedTokensSectionState | undefined {
  const selectedCategory = selectRelatedTokensCategory({ categories, pickedCategoryId })
  if (!selectedCategory) {
    return undefined
  }

  const showChips = categories.length > 1
  const isListEmpty = !isLoading && (isError || tokenCount === 0)
  if (isListEmpty && !showChips) {
    return undefined
  }

  const title = showChips ? t('tdp.relatedTokens.header') : getRelatedTokensTitle({ t, category: selectedCategory })
  return { selectedCategory, showChips, isListEmpty, title }
}
