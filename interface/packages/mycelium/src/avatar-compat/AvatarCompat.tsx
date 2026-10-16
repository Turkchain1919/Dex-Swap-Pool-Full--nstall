// Web/default implementation; native override lives in AvatarCompat.native.tsx.
// Re-exported here so bare module resolution (bundlers without .web extension
// priority) and the base index resolve correctly — the same shape
// FlexCompat/TooltipCompat use: a throwing base stub on a web primitive turns
// any bundler misconfiguration into a runtime crash (the INFRA-3517 hazard).
export * from './AvatarCompat.web'
