import ImageColors from 'react-native-image-colors'
import type { ImageColorsConfig, ImageColorsResult } from './image-colors'

export type { ImageColorsConfig, ImageColorsResult } from './image-colors'

/** Native leg: the real react-native-image-colors module (iOS/Android extraction). */
export async function getImageColors(uri: string, config: ImageColorsConfig): Promise<ImageColorsResult> {
  // SAFETY: the library returns a per-platform discriminated union; the shared
  // pipeline reads it structurally (`platform` discriminates), exactly like the
  // legacy `getExtractedColors`.
  return (await ImageColors.getColors(uri, config)) as unknown as ImageColorsResult
}
