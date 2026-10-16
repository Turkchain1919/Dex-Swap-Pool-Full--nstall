export const FOCUS_SCALE = 0.98
export const PRESS_SCALE = FOCUS_SCALE

// Structurally typed, not `XStackProps['pressStyle']`, so this module carries no Tamagui import.
export const commonPressStyle: { scale: number } = {
  scale: PRESS_SCALE,
}
