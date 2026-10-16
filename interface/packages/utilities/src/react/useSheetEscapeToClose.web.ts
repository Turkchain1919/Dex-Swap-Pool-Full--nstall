import { useEffect, useRef } from 'react'

/**
 * Escape handling for force-mounted bottom sheets, bypassing Radix's
 * cross-instance arbitration.
 *
 * Radix's `useEscapeKeydown` dispatches only to the HIGHEST-mounted
 * `DismissableLayer` — and with `forceMount`, a closed sheet stays registered
 * in that shared stack, so whichever sheet mounts last would permanently
 * swallow Escape for every actually-open sheet (e.g. a page-level
 * `MobileHeaderActions` sheet breaking Escape for the app-wide nav drawer).
 * Sheets therefore keep their own stack of OPEN instances: a plain document
 * keydown listener is attached only while open, and only the top of that
 * stack closes — matching Tamagui Sheet, which arbitrated Escape through its
 * own stack of open sheets. Radix's own Escape dismissal is preventDefault()ed
 * at the sheet Content (via {@link markRadixEscapePreventedBySheet}) so the
 * two mechanisms never double-fire.
 *
 * This module is the ONE stack for every sheet implementation: the legacy
 * `ui/src` sheet and the mycelium compat sheet both coordinate through it, so
 * a closed force-mounted sheet from one family can never swallow Escape for an
 * open sheet from the other while both coexist during the migration.
 *
 * Known corner (documented, accepted): an OPEN Radix dialog stacked above an
 * OPEN sheet also receives the same Escape (its capture-phase listener runs
 * first and closes the dialog; this listener then closes the sheet too). The
 * breakpoint picks dialog-vs-sheet mode globally, so cross-mode stacks are
 * rare; native `defaultPrevented` cannot disambiguate that case because a
 * closed-but-highest force-mounted layer marks the event on every press.
 */
const openSheetEscapeStack: symbol[] = []

/** The last Escape keydown whose default was prevented by SHEET chrome (the sheet Content's
 * onEscapeKeyDown). Radix marks the native event even for a closed force-mounted layer, so
 * `defaultPrevented` alone cannot distinguish "a closed sheet's inert Radix layer touched this"
 * (the open sheet must still close) from "a real inner layer — context menu, dialog — consumed
 * it" (the sheet must NOT also close). Identity comparison against this marker disambiguates. */
let lastEscapePreventedBySheetChrome: KeyboardEvent | null = null

export function markRadixEscapePreventedBySheet(event: KeyboardEvent): void {
  event.preventDefault()
  lastEscapePreventedBySheetChrome = event
}

export function useSheetEscapeToClose({ isOpen, onClose }: { isOpen: boolean; onClose?: () => void }): void {
  const idRef = useRef<symbol | undefined>(undefined)
  if (idRef.current === undefined) {
    idRef.current = Symbol('WebBottomSheet')
  }
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }
    const id = idRef.current as symbol
    openSheetEscapeStack.push(id)
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.isComposing) {
        return
      }
      // Consumed by a real inner layer (context menu, dialog) — not by sheet chrome itself.
      if (event.defaultPrevented && event !== lastEscapePreventedBySheetChrome) {
        return
      }
      if (openSheetEscapeStack[openSheetEscapeStack.length - 1] !== id) {
        return
      }
      event.preventDefault()
      lastEscapePreventedBySheetChrome = event
      onCloseRef.current?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const index = openSheetEscapeStack.indexOf(id)
      if (index !== -1) {
        openSheetEscapeStack.splice(index, 1)
      }
    }
  }, [isOpen])
}
