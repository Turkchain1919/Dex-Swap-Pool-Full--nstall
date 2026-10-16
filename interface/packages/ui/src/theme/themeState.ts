/**
 * Web theme source for the Spore theme hooks: the active theme is the
 * `light`/`dark` class on `<html>` — maintained by each app's theme provider
 * in the same commit as the Tamagui root theme, and the
 * `@universe/tailwind` variables.css convention. Exposed as a
 * `useSyncExternalStore`-compatible store observing root class changes.
 *
 * Only the `.web` legs of the hooks import this; it never evaluates on native.
 */
export type SporeActiveThemeName = 'light' | 'dark'

const subscribers = new Set<() => void>()
let observer: MutationObserver | undefined

export function subscribeToRootTheme(onChange: () => void): () => void {
  subscribers.add(onChange)
  if (observer === undefined && typeof document !== 'undefined') {
    observer = new MutationObserver(() => {
      for (const notify of subscribers) {
        notify()
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  }
  return () => {
    subscribers.delete(onChange)
    if (subscribers.size === 0) {
      observer?.disconnect()
      observer = undefined
    }
  }
}

export function getRootThemeSnapshot(): SporeActiveThemeName {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function getServerThemeSnapshot(): SporeActiveThemeName {
  return 'light'
}
