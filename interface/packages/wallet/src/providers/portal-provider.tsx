import type { JSX, PropsWithChildren } from 'react'
import { AppPortalHost } from 'ui/src/components/portal/AppPortalHost'

/**
 * Mounts the rn-primitives portal layer for the ui/src Portal. The host sits
 * after children, matching where Tamagui's PortalProvider mounted its own root
 * host, so portal z-order is unchanged.
 *
 * Exported separately from <NavigationProvider> so tests can mount it alone.
 */
export function AppPortalProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <>
      {children}
      <AppPortalHost />
    </>
  )
}
