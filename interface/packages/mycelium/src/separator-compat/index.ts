/**
 * `@universe/mycelium/separator-compat` — the compat `Separator` (INFRA-3644),
 * replacing the `Separator` export of the legacy `ui/src` barrel (itself the
 * Tamagui-free INFRA-3318 rebuild of the Tamagui Separator).
 *
 * The component is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; the platform-neutral `./props`
 * module is shared by both legs, which is what keeps their exports and
 * behavior identical.
 */
export { SeparatorCompat } from './SeparatorCompat'
export type { SeparatorCompatProps, SeparatorCompatStyleProps } from './props'
