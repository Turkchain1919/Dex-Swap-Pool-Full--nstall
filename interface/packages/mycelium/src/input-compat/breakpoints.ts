// Web/default implementation; native override lives in breakpoints.native.ts.
// Re-exported here so bare module resolution and tsc resolve the web shape;
// the two legs MUST export the same symbols (pinned by platform-legs.test.ts).
export * from './breakpoints.web'
