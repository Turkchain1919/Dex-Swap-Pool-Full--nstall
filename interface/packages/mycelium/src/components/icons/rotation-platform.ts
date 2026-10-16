// Web/default implementation; the native override lives in
// rotation-platform.native.ts. Re-exported so bare module resolution (bundlers
// without .web extension priority) resolves the web leg instead of crashing —
// the standard compat base-leg mechanism.
export * from './rotation-platform.web'
