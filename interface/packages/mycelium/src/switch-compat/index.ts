/**
 * `@universe/mycelium/switch-compat` — the compat `Switch` (INFRA-3644),
 * replacing the `Switch` + `SwitchProps` exports of the legacy `ui/src` barrel
 * (themselves the Tamagui-free INFRA-3318 rebuild of the Tamagui Switch).
 *
 * The component is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; the platform-neutral `./props`
 * module is shared by both legs, which is what keeps their exports and
 * behavior identical.
 */
export { SwitchCompat } from './SwitchCompat'
export type { SwitchCompatProps, SwitchCompatVariant } from './props'
