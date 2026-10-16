/**
 * `@universe/mycelium/anchor-compat` — the compat `Anchor` (INFRA-3549),
 * replacing the legacy Tamagui `Anchor` re-exported raw from the `ui/src`
 * barrel.
 *
 * The component is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; the platform-neutral module
 * (`./props`) is shared by both legs, which is what keeps their exports and
 * behavior identical.
 */
export { AnchorCompat } from './AnchorCompat'
export { type AnchorCompatProps, DEFAULT_ANCHOR_TAG } from './props'
