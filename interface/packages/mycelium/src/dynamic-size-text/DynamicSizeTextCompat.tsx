// Web/default implementation; native override lives in
// DynamicSizeTextCompat.native.tsx. Re-exported here so bare module resolution
// (bundlers without .web extension priority) and the package barrel resolve
// correctly — the FlexCompat/TouchableAreaCompat mechanism: `moduleSuffixes` is
// configured nowhere in the repo, so tsc only ever resolves this base leg, and
// the two legs MUST export the same symbols with the same types (pinned by
// platform-legs.test.ts).
export * from './DynamicSizeTextCompat.web'
