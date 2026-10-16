import { Platform } from 'react-native'

/**
 * Gates Image's STYLE-PIPELINE behavior (inert web objectFit vs native resizeMode
 * expansion, web-only CSS, click vs responder press wiring, src dimension enrichment,
 * token-dimension resolution). Keyed off the renderer actually in play — react-native-web
 * reports Platform.OS 'web' — because that is what drove the legacy Tamagui driver split:
 * apps/mobile's vitest env renders through react-native-web and its committed legacy
 * snapshots show the WEB pipeline's output even though the app-level platform flag
 * (`isWebPlatform`) is native there.
 */
export const isWebRender = Platform.OS === 'web'
