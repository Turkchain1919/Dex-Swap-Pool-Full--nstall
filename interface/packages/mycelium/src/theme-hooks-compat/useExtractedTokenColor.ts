/**
 * Direct port of ui's useExtractedTokenColor, composed from existing compat legs;
 * every platform-dependent input rides its own leg. Parity-pinned against the ui source.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { isSVGUri } from 'utilities/src/format/urls'
import { useExtractedColors } from './extracted-colors'
import { getSpecialCaseTokenColor } from './special-case-token-color'
import { pickContrastPassingTokenColor } from './token-color-utils'
import { useColorSchemeFromSeed } from './useColorSchemeFromSeed'
import { useIsDarkMode } from './useIsDarkMode'
import { useSporeColors } from './useSporeColors'

/**
 * Picks a contrast-passing color from a given token image URL and background
 * color. The color extracting library returns a few options; this hook picks
 * the best of them.
 *
 * @param imageUrl The URL of the image to extract a color from
 * @param tokenName The ticker of the asset (used to derive a color when no logo is available)
 * @param backgroundColor The hex value of the background color to check contrast against
 * @param defaultColor The color returned while the extraction is still loading
 * @returns The extracted color as a hex code string
 */
export function useExtractedTokenColor({
  imageUrl,
  tokenName,
  backgroundColor,
  defaultColor,
}: {
  imageUrl: string | null | undefined
  tokenName: string | null | undefined
  backgroundColor: string
  defaultColor: string
}): { tokenColor: string | null; tokenColorLoading: boolean } {
  const sporeColors = useSporeColors()
  const { colors, colorsLoading } = useExtractedColors(imageUrl)
  const [tokenColor, setTokenColor] = useState(defaultColor)
  const [tokenColorLoading, setTokenColorLoading] = useState(true)
  const isDarkMode = useIsDarkMode()
  const { foreground } = useColorSchemeFromSeed(tokenName ?? '')

  // Without this, internal state keeps the previous image's color when the URL
  // changes and the new extraction yields no palette (the sync effect below
  // never calls setTokenColor). Keyed on `imageUrl` ALONE, reading
  // `defaultColor` through a ref: with `defaultColor` in the deps, a
  // defaultColor-only re-render AFTER the extraction settles would flip
  // `tokenColorLoading` back to true with nothing left to flip it off (the
  // sync effect's deps never change again) — a permanent loading latch. The
  // legacy hook's dep list carries the same latch; the compat keys the reset
  // to the one input that restarts an extraction.
  const defaultColorRef = useRef(defaultColor)
  defaultColorRef.current = defaultColor
  useEffect(() => {
    if (!imageUrl) {
      return
    }
    setTokenColor(defaultColorRef.current)
    setTokenColorLoading(true)
  }, [imageUrl])

  useEffect(() => {
    if (!colorsLoading) {
      setTokenColorLoading(false)
      if (colors !== undefined) {
        const pickedColor = pickContrastPassingTokenColor({
          extractedColors: colors,
          backgroundHex: backgroundColor,
          isDarkMode,
        })

        setTokenColor(pickedColor)
      }
    }
  }, [backgroundColor, colors, colorsLoading, isDarkMode])

  const specialCaseTokenColor = useMemo(() => {
    return getSpecialCaseTokenColor(imageUrl, isDarkMode)
  }, [imageUrl, isDarkMode])

  if (specialCaseTokenColor) {
    return { tokenColor: specialCaseTokenColor, tokenColorLoading: false }
  }

  if (isSVGUri(imageUrl)) {
    // Fall back to a more neutral color for SVGs — they fail extraction but
    // render elsewhere. `.val` matches legacy: the runtime value is the
    // theme's resolved color on both platforms (the token-literal typing is a
    // compat-surface fiction, see SporeThemeColorToken).
    return { tokenColor: sporeColors.neutral1.val, tokenColorLoading: false }
  }

  if (!imageUrl) {
    return { tokenColor: foreground, tokenColorLoading: false }
  }

  return { tokenColor, tokenColorLoading }
}
