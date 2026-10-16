import { isMobileWeb } from '@universe/environment'
import type { ReactNode } from 'react'
import { RemoveScroll as ReactRemoveScroll } from 'react-remove-scroll'
import type { RemoveScrollProps } from 'ui/src/components/RemoveScroll/RemoveScroll'
import { useDisableBodyScroll } from 'utilities/src/react/useDisableBodyScroll'

/**
 * Default mode (mobile web always; desktop without blockScrollEvents) locks
 * scroll by setting overflow:hidden on <html> via the shared refcounted
 * `useDisableBodyScroll` pool — one pool with the compat WebBottomSheet, so
 * nested overlays from either family cannot unlock the page behind one
 * another. The css lock is compatible with portaled sheets/drawers —
 * react-remove-scroll's event-based blocking breaks them because React's
 * synthetic events propagate through portal boundaries while its DOM
 * contains() check misclassifies those events as "outside" the lock.
 *
 * On desktop with blockScrollEvents we use react-remove-scroll for its
 * event-based blocking, which also prevents scroll on intermediate
 * overflow:auto containers (e.g. tables behind a ContextMenu). removeScrollBar
 * is disabled to avoid injecting overflow:hidden + position:relative on <body>
 * which breaks sticky headers.
 */
export function RemoveScroll({
  enabled = false,
  blockScrollEvents = false,
  children,
  shards,
}: RemoveScrollProps): ReactNode {
  const isEventBlockingMode = !isMobileWeb && blockScrollEvents

  // Invariants: `enabled` is forwarded into the hook rather than gating it, and the default
  // mode never wraps children — a conditional wrapper changes the React tree shape across
  // enabled flips, remounting the subtree and killing Radix Dialog exit animations.
  useDisableBodyScroll(enabled && !isEventBlockingMode)

  if (isEventBlockingMode) {
    if (!enabled) {
      return children
    }
    return (
      <ReactRemoveScroll style={children ? undefined : { display: 'contents' }} removeScrollBar={false} shards={shards}>
        {children}
      </ReactRemoveScroll>
    )
  }

  return children
}
