// Color extraction pipeline for useExtractedTokenColor, ported from ui/src/utils/colors.
// Internal only — not exported from the barrels; the platform split lives in ./image-colors.
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'
import { getImageColors, type ImageColorsResult } from './image-colors'
import type { ColorStrategy, ExtractedColors } from './token-color-utils'
import { useSporeColors } from './useSporeColors'

type ExtractedColorsOptions = {
  /** Theme token whose resolved value seeds the extraction fallback. */
  fallback: 'accent1'
  cache?: boolean
  colorStrategy?: ColorStrategy
}

export async function getExtractedColors(
  imageUrl: string | null | undefined,
  {
    fallback = 'accent1',
    cache = true,
    colorStrategy = 'vibrant',
  }: { fallback?: string; cache?: boolean; colorStrategy?: ColorStrategy },
): Promise<ExtractedColors | undefined> {
  if (!imageUrl) {
    return undefined
  }

  const imageColors = await getImageColors(imageUrl, {
    key: imageUrl,
    ...(fallback && { fallback }),
    ...(cache && { cache }),
  })

  if (imageColors.platform === 'android') {
    return {
      primary: imageColors.dominant,
      base: imageColors.average,
      detail: imageColors.vibrant,
    }
  }

  if (imageColors.platform === 'ios') {
    return applyColorStrategy(imageColors, colorStrategy)
  }

  // The union leaves only 'web' here, but the value comes from an untyped
  // native module — keep legacy's unknown-platform → undefined fallthrough.
  // oxlint-disable-next-line typescript/no-unnecessary-condition
  if (imageColors.platform === 'web') {
    return {
      primary: imageColors.dominant,
      detail: imageColors.vibrant,
    }
  }

  return undefined
}

function applyColorStrategy(
  imageColors: Extract<ImageColorsResult, { platform: 'ios' }>,
  strategy: ColorStrategy,
): ExtractedColors {
  switch (strategy) {
    case 'vibrant':
      return {
        primary: imageColors.primary,
        secondary: imageColors.secondary,
        base: imageColors.background,
        detail: imageColors.detail,
      }
    case 'muted':
      return {
        primary: imageColors.dominant,
        secondary: imageColors.secondary,
        base: imageColors.average,
        detail: imageColors.detail,
      }
    default:
      return {}
  }
}

/**
 * React-query wrapper over `getExtractedColors`, scoped to what
 * `useExtractedTokenColor` consumes (the legacy default options: `accent1`
 * fallback, caching on, vibrant strategy).
 */
export function useExtractedColors(
  imageUrl: string | null | undefined,
  options: ExtractedColorsOptions = { fallback: 'accent1', cache: true },
): { colors?: ExtractedColors; colorsLoading: boolean } {
  const sporeColors = useSporeColors()
  const getColors = useCallback(
    async () =>
      getExtractedColors(imageUrl, {
        fallback: sporeColors[options.fallback].val,
        cache: options.cache,
        colorStrategy: options.colorStrategy,
      }),
    [imageUrl, options.fallback, options.cache, sporeColors, options.colorStrategy],
  )

  const { data: colors, isLoading: colorsLoading } = useQuery({
    queryKey: [ReactQueryCacheKey.ExtractedColors, imageUrl],
    queryFn: getColors,
    enabled: !!imageUrl,
  })

  return { colors, colorsLoading }
}
