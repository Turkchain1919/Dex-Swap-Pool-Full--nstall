// Platform-split base stub. Web loads react-native-image-colors' web module directly so react-native never rides along.
import { PlatformSplitStubError } from '@universe/environment'

/** The subset of react-native-image-colors' config the compat pipeline passes. */
export interface ImageColorsConfig {
  key?: string
  fallback?: string
  cache?: boolean
}

/**
 * The library's per-platform result, as a platform-discriminated union
 * mirroring react-native-image-colors' own shapes (`platform` discriminates,
 * exactly how `getExtractedColors` branches). Every swatch is optional: the
 * library falls back per-swatch and the pipeline guards each read.
 */
export type ImageColorsResult =
  | {
      platform: 'android'
      dominant?: string
      average?: string
      vibrant?: string
      darkVibrant?: string
      lightVibrant?: string
      darkMuted?: string
      lightMuted?: string
      muted?: string
    }
  | {
      platform: 'ios'
      background?: string
      primary?: string
      secondary?: string
      detail?: string
      // Not in the library's iOS shape — the legacy 'muted' strategy reads
      // them anyway (resolving undefined on device); kept optional so the
      // ported pipeline stays a verbatim match.
      dominant?: string
      average?: string
    }
  | {
      platform: 'web'
      dominant?: string
      vibrant?: string
      darkVibrant?: string
      lightVibrant?: string
      darkMuted?: string
      lightMuted?: string
      muted?: string
    }

export function getImageColors(_uri: string, _config: ImageColorsConfig): Promise<ImageColorsResult> {
  throw new PlatformSplitStubError('getImageColors')
}
