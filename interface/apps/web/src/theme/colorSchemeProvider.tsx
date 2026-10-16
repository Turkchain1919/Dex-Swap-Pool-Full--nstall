import { useLayoutEffect, type JSX, type PropsWithChildren } from 'react'
import { useSelectedColorScheme } from 'uniswap/src/features/appearance/hooks'

/**
 * Single source of truth for the web `.dark` class Tailwind's dark variant reads.
 * Toggled in a layout effect so the DOM write lands before paint. Don't toggle
 * `.dark` anywhere else.
 */
export function ColorSchemeProvider({ children }: PropsWithChildren): JSX.Element {
  const darkMode = useSelectedColorScheme() === 'dark'

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return <>{children}</>
}
