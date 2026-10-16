import { opacifyRaw } from '@universe/mycelium/theme-hooks-compat'

export const POOLS_URL = 'https://pools.xyz'

/** Teaser banner frame — exact brand values from the design, not theme surfaces. */
export const POOLS_TEASER_BACKGROUND_LIGHT = 'linear-gradient(90deg, #D0ED27 0%, #CCED27 100%)'
export const POOLS_TEASER_BACKGROUND_DARK = 'linear-gradient(90deg, #131313 0%, #101F0C 100%)'
export const POOLS_TEASER_BORDER_LIGHT = opacifyRaw(8, '#131313')
export const POOLS_TEASER_BORDER_DARK = opacifyRaw(12, '#FFFFFF')
