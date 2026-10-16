import { PlatformSplitStubError } from 'utilities/src/errors'

export interface UseContextMenuPressGateParams {
  /** Elapsed ms from first press-in treated as a long-press (default 500, matching the native menu). */
  duration?: number
  /** When false the native menu can't open, so presses are never suppressed (default true). */
  isMenuEnabled?: boolean
  onPress?: () => void
}

export interface UseContextMenuPressGateResult {
  onPressIn: () => void
  onPressOut: () => void
  handlePress: () => void
}

/** Prevents onPress from firing after a long-press opens a native context menu. */
export function useContextMenuPressGate(_params: UseContextMenuPressGateParams): UseContextMenuPressGateResult {
  throw new PlatformSplitStubError('useContextMenuPressGate')
}
