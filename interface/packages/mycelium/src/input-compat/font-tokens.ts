// Web/default implementation; native override lives in font-tokens.native.ts.
// Re-exported here so bare module resolution and tsc (which only ever resolve
// this base leg) see the web shape; the two legs MUST export the same symbols
// with the same types (pinned by platform-legs.test.ts).
export * from './font-tokens.web'
