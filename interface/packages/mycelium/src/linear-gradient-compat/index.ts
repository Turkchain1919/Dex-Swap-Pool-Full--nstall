/**
 * `@universe/mycelium/linear-gradient-compat` — the compat `LinearGradient`,
 * replacing the legacy `@tamagui/linear-gradient` re-exported from the
 * `ui/src` barrel.
 *
 * The component is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; the platform-neutral modules
 * (`./props`, `./compile`) are shared by both legs, which is what keeps their
 * exports and stop-color resolution identical.
 */
export {
  gradientAngleDegrees,
  gradientStopColor,
  gradientStopCssExpression,
  linearGradientBackgroundImage,
} from './compile'
export { LinearGradientCompat } from './LinearGradientCompat'
export type {
  LinearGradientCompatProps,
  LinearGradientCompatStyleProps,
  LinearGradientPoint,
  LinearGradientPointInput,
  LinearGradientStopProps,
} from './props'
