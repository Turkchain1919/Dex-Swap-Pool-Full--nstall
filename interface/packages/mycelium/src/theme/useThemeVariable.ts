/**
 * Platform-split base stub — bundlers resolve `useThemeVariable.native` /
 * `useThemeVariable.web` (the `ui/src` convention). The hook is native-first:
 * it exists to read theme tokens out of uniwind's variable store, and the
 * native legs that need it (Shimmer, Unicon) import
 * `./useThemeVariable.native` explicitly. The web leg is a deliberate stub —
 * see its header.
 */
import { PlatformSplitStubError } from '@universe/environment'

export function useThemeVariable(_name: string): string | number | undefined {
  throw new PlatformSplitStubError('useThemeVariable')
}
