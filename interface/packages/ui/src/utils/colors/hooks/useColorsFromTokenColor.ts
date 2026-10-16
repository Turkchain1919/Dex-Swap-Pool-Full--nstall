import type { ColorTokens } from '@universe/mycelium'
import { useMemo } from 'react'
import { opacify, validColor } from 'ui/src/theme'

export const useColorsFromTokenColor = (
  tokenColor?: string,
): Record<'validTokenColor' | 'lightTokenColor', ColorTokens | undefined> => {
  const { validTokenColor, lightTokenColor } = useMemo(() => {
    const validatedColor = validColor(tokenColor)

    return {
      validTokenColor: tokenColor ? validatedColor : undefined,
      lightTokenColor: tokenColor && validatedColor ? opacify(12, validatedColor) : undefined,
    }
  }, [tokenColor])

  return { validTokenColor, lightTokenColor }
}
