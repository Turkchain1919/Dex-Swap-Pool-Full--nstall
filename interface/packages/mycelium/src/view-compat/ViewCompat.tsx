// Web/default implementation; native override lives in ViewCompat.native.tsx.
// Re-exported here so bare module resolution (bundlers without .web extension
// priority) and the package barrel resolve correctly — see FlexCompat.tsx for
// why this follows the TouchableAreaCompat re-export shape rather than
// packages/mycelium/CLAUDE.md's throwing base stub.
export * from './ViewCompat.web'
