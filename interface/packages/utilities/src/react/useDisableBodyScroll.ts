import { PlatformSplitStubError } from 'utilities/src/errors'

/**
 * The shared refcounted html scroll lock. Every html-overflow locker must
 * join this one pool — see the web leg for the coexistence rationale
 * (INFRA-3559).
 *
 * Web-only — use from `*.web.tsx` files.
 */
export function useDisableBodyScroll(_enabled: boolean): void {
  throw new PlatformSplitStubError('useDisableBodyScroll')
}
