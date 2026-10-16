/**
 * Web leg of `useIsDarkMode`, Tamagui-free: true when the root
 * theme class (ui/src/theme/themeState) is `dark` — kept in lockstep with the
 * Tamagui root theme by each app's theme provider.
 */
import { useSyncExternalStore } from 'react'
import { getRootThemeSnapshot, getServerThemeSnapshot, subscribeToRootTheme } from 'ui/src/theme/themeState'

export function useIsDarkMode(): boolean {
  return useSyncExternalStore(subscribeToRootTheme, getRootThemeSnapshot, getServerThemeSnapshot) === 'dark'
}
