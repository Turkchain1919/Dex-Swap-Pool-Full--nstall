import { useIsDarkMode, useSporeColors } from '@universe/mycelium/theme-hooks-compat'

/** The hero's "Pools" wordmark reads darker on light surfaces; dark mode shares the brand green. */
const POOLS_WORDMARK_GREEN_LIGHT = '#47AC2A'

/** Resolved raw hex — consumers pass it to icon/text color props and to `opacifyRaw`. */
export function usePoolsBrandGreen(): string {
  return useSporeColors().poolsBrandGreen.val
}

/** The hero wordmark's green: darker than the brand green on light surfaces, the same in dark mode. */
export function usePoolsWordmarkGreen(): string {
  const isDarkMode = useIsDarkMode()
  const brandGreen = usePoolsBrandGreen()
  return isDarkMode ? brandGreen : POOLS_WORDMARK_GREEN_LIGHT
}
