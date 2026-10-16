/**
 * DOM marker a focus-trapping modal (ui/src AdaptiveWebModal.web.tsx) sets on
 * its content element so nested compat popovers portal INTO the trap's
 * subtree (SWAP-3309). A Radix modal Dialog's FocusScope yanks focus back
 * into its own subtree on every focusin, so a popup portaled to document.body
 * can never hold focus inside it.
 *
 * Hosts coordinate through this attribute and `trigger.closest()`, not a
 * shared JS value: rolldown can duplicate a module's body across chunks,
 * splitting any cross-package module-level identity (a React context
 * included) into distinct instances. Strings compare by value.
 */
export const OVERLAY_PORTAL_CONTAINER_ATTRIBUTE = 'data-overlay-portal-container'
