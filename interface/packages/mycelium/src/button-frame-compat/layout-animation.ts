// Web/default implementation; the native override lives in
// layout-animation.native.ts. Re-exported so bare module resolution (bundlers
// without .web extension priority) resolves the no-op instead of crashing —
// the standard compat base-leg mechanism.
export * from './layout-animation.web'
