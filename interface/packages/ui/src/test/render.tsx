import { useEffect, type JSX, type PropsWithChildren } from 'react'

// Ref-count concurrent dark-harness mounts so unmounting one tree doesn't strip the class from
// another that is still mounted.
let darkHarnessMounts = 0

/**
 * Helper component to wrap tests in a provider for tests.
 */
export function SharedUIUniswapProvider({ children }: PropsWithChildren): JSX.Element {
  // The ui/src theme hooks read the root `dark` class (the app providers keep it in lockstep with
  // the selected color scheme), so the harness pins it while mounted. Set during render — children's
  // initial render already reads it (idempotent, so re-renders are safe) — and released per mount so
  // light-harness tests in the same file are unaffected.
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark')
  }
  useEffect(() => {
    darkHarnessMounts += 1
    return () => {
      darkHarnessMounts -= 1
      if (darkHarnessMounts === 0 && typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  return <>{children}</>
}
