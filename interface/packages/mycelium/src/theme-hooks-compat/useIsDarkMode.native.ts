/**
 * Native leg of the `useIsDarkMode` compat (INFRA-2353): true when uniwind's
 * runtime theme (`Uniwind.setTheme`, driven by the app's theme provider — the
 * native analog of the web root class) is `dark`.
 */
import { useUniwind } from 'uniwind'

export function useIsDarkMode(): boolean {
  return useUniwind().theme === 'dark'
}
