import { useResolveTokenCategories } from 'uniswap/src/data/apiClients/dataApiService/categories/useResolveTokenCategories'
import type { TokenCategory } from 'uniswap/src/features/tokenCategories/types'
import { useTDPStore } from '~/pages/TokenDetails/context/useTDPStore'

/**
 * The page token's categories in canonical order. `isLoading` is only true while the token has category
 * ids still being resolved, so a token with no categories never reserves space for them.
 */
export function useTDPTokenCategories(): { categories: TokenCategory[]; isLoading: boolean } {
  const { categoryIds, multichainTokenLoaded } = useTDPStore((s) => ({
    categoryIds: s.multichainToken?.categoryIds,
    multichainTokenLoaded: s.multichainTokenLoaded,
  }))
  const { categories, isLoading } = useResolveTokenCategories({ categoryIds, isLoading: !multichainTokenLoaded })
  const hasCategoryIds = (categoryIds?.length ?? 0) > 0

  return { categories, isLoading: isLoading && hasCategoryIds }
}
