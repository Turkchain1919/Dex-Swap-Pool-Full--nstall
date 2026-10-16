/**
 * Web leg of the `useIsTouchDevice` compat (Tamagui's `useIsTouchDevice` via
 * `ui/src`): `false` on the server snapshot and `isTouchable` on the client,
 * exactly like the Tamagui hook (`useDidFinishSSR() ? isTouchable : false`).
 *
 * `isTouchable` never changes, so `useSyncExternalStore` isn't subscribing to
 * anything (the subscription never fires) — it's React's hydration-safety
 * split. `isTouchable` is `false` wherever `window` is undefined, so server
 * HTML is rendered with `false`; the server snapshot keeps the hydration
 * render agreeing with that HTML, then React re-renders with the real client
 * capability. Returning the constant directly would make a touch device's
 * hydration render disagree with the server HTML (a hydration mismatch in
 * SSR consumers like dev-portal/mission-control). Tamagui's hook has the
 * identical mechanism: its `useDidFinishSSR` IS
 * `useSyncExternalStore(subscribe, () => true, () => false)`.
 *
 * `@universe/environment.isTouchable` is the ONE Tamagui-free source for
 * touch capability — the same constant `ui/src`'s modal internals read — so
 * the hook and the module constant can never disagree.
 */
import { isTouchable } from '@universe/environment'
import { useSyncExternalStore } from 'react'

const subscribeNever = (): (() => void) => () => {}
const getClientSnapshot = (): boolean => isTouchable
const getServerSnapshot = (): boolean => false

export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(subscribeNever, getClientSnapshot, getServerSnapshot)
}
