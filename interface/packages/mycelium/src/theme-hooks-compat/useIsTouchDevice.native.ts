/**
 * Native leg of the `useIsTouchDevice` compat: always `true`, matching the
 * Tamagui hook (native short-circuits to `true` before any SSR gate) and
 * `@universe/environment`'s native `isTouchable`.
 */
import { isTouchable } from '@universe/environment'

export function useIsTouchDevice(): boolean {
  return isTouchable
}
