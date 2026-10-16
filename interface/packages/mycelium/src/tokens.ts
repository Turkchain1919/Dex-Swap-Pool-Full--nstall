/**
 * Token-constants compat for the Tamagui→Tailwind migration — the public
 * `@universe/mycelium/tokens` surface.
 *
 * A barrel over two pieces: ./token-constants.ts holds every
 * platform-invariant family, and `fonts` is a three-leg platform split because
 * ui applies a +1px native ramp and names the real React Native font family —
 * see ./font-tokens.ts. Keeping the invariant families in a leaf lets
 * in-package modules (./compat/tokens.ts) read them without pulling in the
 * split's module graph.
 *
 * Exit test: tokens.parity.test.ts (web column) plus
 * packages/tailwind/src/parity/fonts-token/native-parity.test.ts (the device
 * columns, which mycelium's own web-resolving config cannot reach).
 */
export { fonts } from './font-tokens'
export * from './token-constants'
