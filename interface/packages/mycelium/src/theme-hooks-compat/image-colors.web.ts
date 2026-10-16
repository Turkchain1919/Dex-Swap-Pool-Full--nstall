// @ts-expect-error: this exists but is untyped — the same deep import the
// legacy `ui/src/utils/colors/platform/rn-image-colors.web.ts` uses so the
// web app never pulls react-native along for the ride.
import { RNImageColors } from 'react-native-image-colors/lib/module/module.web'
import type { ImageColorsConfig, ImageColorsResult } from './image-colors'

export type { ImageColorsConfig, ImageColorsResult } from './image-colors'

/** Web leg: react-native-image-colors' web module (canvas-based extraction). */
export function getImageColors(uri: string, config: ImageColorsConfig): Promise<ImageColorsResult> {
  // SAFETY: the deep module is untyped; the result shape is the library's
  // documented per-platform record, read structurally by the shared pipeline.
  return (
    RNImageColors as { getColors: (uri: string, config: ImageColorsConfig) => Promise<ImageColorsResult> }
  ).getColors(uri, config)
}
