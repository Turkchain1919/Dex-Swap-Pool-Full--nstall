/**
 * `@universe/mycelium/spinning-loader-compat` — the compat `SpinningLoader`
 * (INFRA-3644), replacing the `SpinningLoader` export of the legacy `ui/src`
 * barrel (itself the Tamagui-free INFRA-3286 rebuild of the Tamagui
 * SpinningLoader).
 *
 * The component is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; the platform-neutral `./props`
 * module is shared by both legs, which is what keeps their exports and
 * behavior identical.
 */
export { SpinningLoaderCompat } from './SpinningLoaderCompat'
export type { SpinningLoaderCompatProps } from './props'
