/**
 * The custom-`backgroundColor` contrast helper, moved out of `./compile`
 * verbatim — purely for the oxlint `max-lines` cap, the same reason
 * `./dimensions` and `./native-props` exist. `./compile` re-exports it, so it
 * stays the single import surface the legs and the parity suites read.
 */

// Ports getContrastPassingTextColor: white if WCAG contrast vs white >= 3, else black.
function parseColorToRgb(color: string): { r: number; g: number; b: number } | undefined {
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim())
  if (hexMatch?.[1]) {
    const hex = hexMatch[1]
    if (hex.length === 3) {
      return {
        r: parseInt(hex.charAt(0) + hex.charAt(0), 16),
        g: parseInt(hex.charAt(1) + hex.charAt(1), 16),
        b: parseInt(hex.charAt(2) + hex.charAt(2), 16),
      }
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }
  const rgbMatch = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(color.trim())
  if (rgbMatch?.[1] && rgbMatch[2] && rgbMatch[3]) {
    return { r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) }
  }
  return undefined
}

/**
 * The label/icon/spinner class for a caller-supplied background: `text-white`
 * unless contrast demands black; `undefined` for a value it cannot measure
 * (e.g. a theme token), so the caller keeps the variant cell's own colour.
 */
export function getContrastTextClass(backgroundColor: string): string | undefined {
  const rgb = parseColorToRgb(backgroundColor)
  if (!rgb) {
    return undefined
  }
  const channel = (v: number): number => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const luminance = 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
  const contrastVsWhite = 1.05 / (luminance + 0.05)
  return contrastVsWhite >= 3 ? 'text-white' : 'text-black'
}
