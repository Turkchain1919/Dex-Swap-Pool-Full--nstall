// No defaulting wrapper here, unlike the web leg: `ButtonTextCompat.native.tsx` already
// hardcodes `numberOfLines={1}` and `maxFontSizeMultiplier={1.2}`.
export { ButtonTextCompat as CustomButtonText } from '@universe/mycelium/button-frame-compat'
export type { ButtonTextCompatProps as CustomButtonTextProps } from '@universe/mycelium/button-frame-compat'
