/**
 * Native leg of `useIsDarkMode`, Tamagui-free: true when
 * uniwind's runtime theme (`Uniwind.setTheme`, driven by the app's theme
 * provider — the native analog of the web root class) is `dark`.
 */
import { useUniwind } from 'uniwind'

export function useIsDarkMode(): boolean {
  return useUniwind().theme === 'dark'
}
