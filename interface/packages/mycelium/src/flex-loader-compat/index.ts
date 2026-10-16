/**
 * `@universe/mycelium/flex-loader-compat` — the compat `FlexLoader`, replacing the
 * legacy Tamagui `FlexLoader` from `packages/ui/src/loading/FlexLoader.tsx`.
 *
 * Platform-neutral throughout: the component composes `FlexCompat` by its
 * BASE specifier, so Metro resolves the flex compat's `.native.tsx` leg and
 * vite its `.web.tsx` leg — no legs of its own to keep in sync.
 */
export { FlexLoaderCompat } from './FlexLoaderCompat'
export type { FlexLoaderProps } from './props'
