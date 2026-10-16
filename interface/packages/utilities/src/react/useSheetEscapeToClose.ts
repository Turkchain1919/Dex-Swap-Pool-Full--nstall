import { PlatformSplitStubError } from 'utilities/src/errors'

/**
 * Escape coordination for force-mounted web bottom sheets. ONE stack shared by
 * every sheet implementation (the legacy `ui/src` sheet and the mycelium
 * compat sheet), so Escape arbitration keeps working while both render in the
 * same app during the Tamagui → Tailwind migration.
 *
 * Web-only — use from `*.web.tsx` files.
 */
export function useSheetEscapeToClose(_params: { isOpen: boolean; onClose?: () => void }): void {
  throw new PlatformSplitStubError('useSheetEscapeToClose')
}

/** Marks an Escape keydown as consumed by sheet chrome (see the web leg). */
export function markRadixEscapePreventedBySheet(_event: KeyboardEvent): void {
  throw new PlatformSplitStubError('markRadixEscapePreventedBySheet')
}
