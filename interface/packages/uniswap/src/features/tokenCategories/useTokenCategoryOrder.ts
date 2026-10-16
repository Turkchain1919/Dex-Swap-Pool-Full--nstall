import { DynamicConfigs, TokenCategoriesOrderConfigKey, useDynamicConfigValue } from '@universe/gating'
import { useMemo } from 'react'
import { orderTokenCategories } from 'uniswap/src/features/tokenCategories/orderTokenCategories'
import { TokenCategory } from 'uniswap/src/features/tokenCategories/types'

const EMPTY_ORDER: string[] = []

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

export function useTokenCategoryOrder(categories: TokenCategory[]): TokenCategory[] {
  const orderedCategoryIds = useDynamicConfigValue({
    config: DynamicConfigs.TokenCategoriesOrder,
    key: TokenCategoriesOrderConfigKey.OrderedCategoryIds,
    defaultValue: EMPTY_ORDER,
    customTypeGuard: isStringArray,
  })

  return useMemo(() => orderTokenCategories({ categories, orderedCategoryIds }), [categories, orderedCategoryIds])
}
