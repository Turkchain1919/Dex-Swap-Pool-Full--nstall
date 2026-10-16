export type EnterFromStyle = { opacity?: number; scale?: number }

export const DEFAULT_ENTER_STYLE: Required<EnterFromStyle> = { opacity: 0, scale: 0.8 }

/** Default gap between consecutive `index`es. Exported so siblings can align their own animations. */
export const ANIMATE_IN_ORDER_DELAY_MS = 150

/**
 * The reveal curve, kept here so both legs move together: web hands the preset name to Tamagui,
 * native runs the spring directly. Values mirror `bouncy` in `ui/src/theme/animations/index.native.ts`.
 */
export const ANIMATE_IN_ORDER_ANIMATION = 'bouncy'
export const ANIMATE_IN_ORDER_SPRING = { damping: 10, mass: 0.9, stiffness: 100 }
