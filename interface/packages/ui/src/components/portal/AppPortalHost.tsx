import { PortalHost } from '@rn-primitives/portal'

/**
 * Host name for the app-root portal layer used by `ui/src/components/portal/Portal`.
 * A named host (rather than the rn-primitives default) keeps app portals isolated from
 * any other `@rn-primitives/portal` consumers that may appear later.
 */
export const APP_PORTAL_HOST_NAME = 'uniswap-app-root'

/**
 * Render target for `ui/src/components/portal/Portal` (Tamagui → rn-primitives migration).
 *
 * Mount once per app, directly inside the root Tamagui provider and after the app's children —
 * the exact position where Tamagui's `PortalProvider` mounts its own root portal host — so
 * portaled overlays keep identical full-window placement and paint order. Renders nothing until
 * a portal targets it, so it is inert on web, where the Portal web leg still uses Tamagui.
 */
export function AppPortalHost(): JSX.Element {
  return <PortalHost name={APP_PORTAL_HOST_NAME} />
}
