import type { ColorTokens } from '@universe/mycelium'
import type { UseSporeColorsReturn } from '@universe/mycelium/theme-hooks-compat'
import { useMemo } from 'react'
import { getFadedDecimalColor } from 'uniswap/src/components/AnimatedNumber/utils/getCharDisplayColor'
import { resolveAnimatedNumberColor } from 'uniswap/src/components/AnimatedNumber/utils/resolveAnimatedNumberColor'

export type ResolvedAnimatedNumberColors = {
  baseColor: string
  hasCustomColor: boolean
  decimalPartColor: string
  balanceChangeColor: string | undefined
}

type UseResolvedAnimatedNumberColorsParams = {
  colors: UseSporeColorsReturn
  color?: ColorTokens
  shouldFadeDecimals: boolean
  nextColor?: string
}

export function useResolvedAnimatedNumberColors({
  colors,
  color,
  shouldFadeDecimals,
  nextColor,
}: UseResolvedAnimatedNumberColorsParams): ResolvedAnimatedNumberColors {
  return useMemo(() => {
    const baseColor = resolveAnimatedNumberColor(colors, color)
    const hasCustomColor = color !== undefined
    const decimalPartColor = getFadedDecimalColor({
      shouldFadeDecimals,
      baseColor,
      fadedDecimalColor: colors.neutral2.val,
      hasCustomColor,
    })
    const balanceChangeColor = hasCustomColor ? undefined : nextColor

    return { baseColor, hasCustomColor, decimalPartColor, balanceChangeColor }
  }, [colors, color, shouldFadeDecimals, nextColor])
}
