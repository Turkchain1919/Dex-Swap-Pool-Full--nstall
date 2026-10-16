import type * as React from 'react'
import type { WebBottomSheetProps } from './props'

/**
 * Web/extension-only bottom sheet, mirroring the render-nothing standalone
 * `WebBottomSheet` export in the legacy barrel's native leg
 * (`ui/src/components/modal/AdaptiveWebModal.native.tsx` — the legacy
 * `WebBottomSheet.native.tsx` is its unreachable throwing platform-split
 * stub): renders nothing on native (native bottom sheets are gorhom-based via
 * `uniswap/src/components/modals/Modal.native.tsx`).
 */
export function WebBottomSheet(_props: WebBottomSheetProps): React.JSX.Element | null {
  return null
}
