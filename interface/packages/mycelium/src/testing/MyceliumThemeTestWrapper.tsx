import { type ReactNode, useLayoutEffect, useRef } from 'react'

export interface MyceliumThemeTestWrapperProps {
  children?: ReactNode
  /** @default 'light' */
  theme?: 'light' | 'dark'
}

/**
 * Drop-in RTL `wrapper` replacement for the legacy `<TamaguiProvider
 * defaultTheme="...">` test pattern (INFRA-3807).
 *
 * Mycelium reads its active theme from a `dark`/`light` class on
 * `document.documentElement` (`theme-hooks-compat/theme-state.ts`'s
 * `getRootThemeSnapshot`), not React context — there is no provider to
 * mount. This sets that class for the render's lifetime and restores
 * whatever was there before on unmount, so it composes safely across a test
 * file's `render()` calls (parallel to how the legacy wrapper mounted and
 * unmounted a fresh `TamaguiProvider` per render).
 *
 * Usage, replacing a legacy `ThemeWrapper`:
 * ```tsx
 * const render = (ui: ReactElement) =>
 *   rtlRender(ui, { wrapper: (props) => <MyceliumThemeTestWrapper theme="light" {...props} /> })
 * ```
 */
export function MyceliumThemeTestWrapper({ children, theme = 'light' }: MyceliumThemeTestWrapperProps): ReactNode {
  // Toggled during render, not in an effect: `getRootThemeSnapshot` reads this class
  // synchronously from a descendant's OWN render (`useSyncExternalStore`), which happens
  // before any effect in this commit runs — a layout effect would apply the class one
  // render too late for a synchronous assertion right after `render()`, only self-correcting
  // once the theme-state module's MutationObserver microtask fires and forces a re-render.
  const hadDarkClassRef = useRef<boolean | undefined>(undefined)
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    hadDarkClassRef.current ??= root.classList.contains('dark')
    root.classList.toggle('dark', theme === 'dark')
  }
  // Restore-on-unmount only; the toggle itself already happened above.
  useLayoutEffect(() => {
    return () => {
      if (typeof document !== 'undefined' && hadDarkClassRef.current !== undefined) {
        document.documentElement.classList.toggle('dark', hadDarkClassRef.current)
      }
    }
  }, [])
  return children
}
