import { Portal as MyceliumPortal } from '@universe/mycelium/portal'
import type { PortalProps } from 'ui/src/components/portal/Portal'

/**
 * Web leg on the Mycelium portal primitive (`@universe/mycelium/portal`),
 * replacing Tamagui's Portal.
 *
 * Z-order is unchanged: the Mycelium leg is the same mechanism Tamagui's web
 * Portal used, a react-dom `createPortal` into `document.body`, with the same
 * full-window wrapper (`position: fixed; inset: 0; contain: strict;
 * pointer-events: none`) and the same stacked z-index arithmetic. The
 * objection this file used to carry was about a portal HOST inside the React
 * tree, which cannot escape ancestor stacking contexts; a document-level
 * portal is not that, and is what both implementations do.
 *
 * Native stays on `@rn-primitives/portal` into `AppPortalHost` (see
 * `Portal.native.tsx`); it was already Tamagui-free, so moving it onto the
 * Mycelium native leg is a separate consolidation.
 */
export function Portal({ children, zIndex, stackZIndex }: PortalProps): JSX.Element {
  return (
    <MyceliumPortal stackZIndex={stackZIndex} zIndex={zIndex}>
      {children}
    </MyceliumPortal>
  )
}
