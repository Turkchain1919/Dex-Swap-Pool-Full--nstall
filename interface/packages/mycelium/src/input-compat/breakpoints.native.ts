/**
 * `$sm`/`$md` breakpoint hooks for the Input compat, native leg:
 * dimension-driven, mirroring the legacy react-native media driver
 * (max-* bounds are inclusive, like CSS).
 */
import { useWindowDimensions } from 'react-native'
import { BREAKPOINT_PX } from '../theme-hooks-compat/tokens'

function createMaxWidthHook(maxWidth: number): () => boolean {
  const useMaxWidthBreakpoint = (): boolean => {
    const { width } = useWindowDimensions()
    return width <= maxWidth
  }
  return useMaxWidthBreakpoint
}

export const useIsSmBreakpoint = createMaxWidthHook(BREAKPOINT_PX.sm)
export const useIsMdBreakpoint = createMaxWidthHook(BREAKPOINT_PX.md)
