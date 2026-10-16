/**
 * Local port of legacy `getMaybeHexOrRGBColor`
 * (`ui/src/components/buttons/Button/utils/getMaybeHexOrRGBColor.ts`) — the
 * gate deciding whether a `backgroundColor` takes the custom-background lane
 * (concrete hex/rgb) or stays an ordinary themed style prop. Reimplemented
 * here because mycelium must never import `packages/ui`.
 */

export type HexOrRgbColor = `#${string}` | `rgb(${string})` | `rgba(${string})`

export function getMaybeHexOrRgbColor(color: unknown): HexOrRgbColor | undefined {
  if (!color || typeof color !== 'string') {
    return undefined
  }
  if (color.charAt(0) === '#' && (color.length === 7 || color.length === 9 || color.length === 4)) {
    return color as HexOrRgbColor
  }
  if (color.startsWith('rgb')) {
    return color as HexOrRgbColor
  }
  return undefined
}
