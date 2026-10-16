/**
 * `@universe/mycelium/button-frame-compat` — the frame-tier legacy button
 * surface for the INFRA-3315 ui/src rebuild: `CustomButtonFrame` /
 * `CustomButtonText` / `ThemedIcon` / `ThemedSpinningLoader` twins over the
 * parity-proven ButtonCompat class tables plus the open compat style-prop
 * lane, and the literal class tables for the `IconButtonFrame` /
 * `DropdownButtonFrame` styled()-extension deltas (they must live under the
 * `@source`-scanned mycelium root). Subpath export only, like
 * `./button-compat` — adoption stays visible in imports.
 */
export { ButtonFrameCompat } from './ButtonFrameCompat'
export type { ButtonFrameCompatProps } from './props'
export type { ButtonFrameVariantProps } from './props'
export { ButtonTextCompat } from './ButtonTextCompat'
export type { ButtonTextCompatProps } from './text-props'
export { ThemedIconCompat, ThemedSpinnerCompat } from './ThemedIconCompat'
export type { ThemedIconCompatProps, ThemedSpinnerCompatProps, TypeOfButton } from './themed-icon-props'
export { ButtonFrameContextProvider, useButtonFrameContext } from './context'
export {
  buttonFrameOpenClassName,
  buttonFrameOpenEmission,
  DROPDOWN_EXPANDED_ICON_CLASSES,
  DROPDOWN_FRAME_BASE_CLASSES,
  DROPDOWN_FRAME_EXPANDED_CLASSES,
  DROPDOWN_TEXT_EXPANDED_CLASSES,
  ICON_BUTTON_ICON_SIZE_CLASSES,
  ICON_BUTTON_ICON_SIZE_PX,
  ICON_BUTTON_SIZE_CLASSES,
  type ButtonFrameContextValue,
  type ButtonFrameOpenProps,
  type ButtonFrameStyleProps,
  type ButtonEmphasis,
  type ButtonFocusScaling,
  type ButtonIconPosition,
  type ButtonSize,
  type ButtonVariant,
} from './compile'
export { getMaybeHexOrRgbColor, type HexOrRgbColor } from './custom-color'
