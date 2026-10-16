// Base leg: bare resolution and tsc only ever see this one, so it re-exports
// the web shape. Both legs MUST export the same symbols with the same types
// (pinned by font-tokens.platform-legs.test.ts).
export * from './font-tokens.web'
