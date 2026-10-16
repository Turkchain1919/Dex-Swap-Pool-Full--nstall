// Web/default implementation; the native override lives in
// measureDropdownAnchor.native.ts. Re-exported so bare module resolution
// resolves the web leg instead of crashing — the standard compat base-leg mechanism.
export type { DropdownAnchorNode, MeasuredAnchor } from './measureDropdownAnchor.types'
export * from './measureDropdownAnchor.web'
