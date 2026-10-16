// Web/default implementation; the native override lives in
// actionSheetDropdownPresence.native.ts. Re-exported so bare module resolution
// (bundlers without .web extension priority) resolves the web leg instead of
// crashing — the standard compat base-leg mechanism.
export * from './actionSheetDropdownPresence.web'
