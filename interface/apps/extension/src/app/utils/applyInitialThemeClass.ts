import { STATE_STORAGE_KEY } from 'src/store/constants'
import { AppearanceSettingType } from 'uniswap/src/features/appearance/slice'

/**
 * Resolves the redux-persisted appearance setting the same way `useSelectedColorScheme` does:
 * an explicit Dark/Light setting wins; System — or missing/unreadable state, e.g. a fresh
 * install — follows the OS preference.
 */
export function isDarkFromPersistedState({
  persistedState,
  prefersDark,
}: {
  persistedState: string | undefined
  prefersDark: boolean
}): boolean {
  try {
    const setting = persistedState === undefined ? undefined : readSelectedAppearanceSetting(persistedState)
    if (setting === AppearanceSettingType.Dark) {
      return true
    }
    if (setting === AppearanceSettingType.Light) {
      return false
    }
    // Diverges from useSelectedColorScheme here: an unrecognized value follows the OS scheme rather than defaulting to light, since that's the safer guess and such corruption is unlikely to survive redux-persist migrations anyway.
    return prefersDark
  } catch {
    return prefersDark
  }
}

function readSelectedAppearanceSetting(persistedState: string): unknown {
  // redux-persist stores each slice as its own JSON string inside the JSON-encoded root record
  const root: unknown = JSON.parse(persistedState)
  if (typeof root !== 'object' || root === null) {
    return undefined
  }
  const appearanceSettings = (root as Record<string, unknown>)['appearanceSettings']
  if (typeof appearanceSettings !== 'string') {
    return undefined
  }
  const parsed: unknown = JSON.parse(appearanceSettings)
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined
  }
  return (parsed as Record<string, unknown>)['selectedAppearanceSettings']
}

function prefersDarkColorScheme(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

/**
 * Applies the `.dark` class to <html> before the first React render.
 *
 * `useIsDarkMode` (and the DarkMode analytics user property written from TraceUserProperties)
 * read the root class at render time, while TailwindThemeSync only writes it from an effect —
 * without a pre-render set, the first render of every entrypoint reads light. Reads the
 * persisted appearance setting straight from chrome.storage because the redux store rehydrates
 * asynchronously. TailwindThemeSync remains the ongoing sync once React is mounted.
 *
 * Never rejects: on any failure it falls back to the OS color scheme so rendering is never
 * blocked.
 */
export async function applyInitialThemeClass(): Promise<void> {
  const prefersDark = prefersDarkColorScheme()
  let isDark = prefersDark
  try {
    const items = await chrome.storage.local.get(STATE_STORAGE_KEY)
    const persistedState: unknown = items[STATE_STORAGE_KEY]
    isDark = isDarkFromPersistedState({
      persistedState: typeof persistedState === 'string' ? persistedState : undefined,
      prefersDark,
    })
  } catch {
    // chrome.storage unavailable or unreadable — the OS preference is the best available guess
  }
  document.documentElement.classList.toggle('dark', isDark)
}
