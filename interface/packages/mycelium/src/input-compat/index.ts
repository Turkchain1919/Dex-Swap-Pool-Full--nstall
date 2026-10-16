/**
 * `@universe/mycelium/input-compat` — the compat `Input` (INFRA-3600),
 * replacing the `Input` + `inputStyles` exports of the legacy `ui/src` barrel
 * (themselves the Tamagui-free INFRA-3318 rebuild of the Tamagui Input).
 *
 * The component is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; the platform-neutral modules
 * (`./props`, `./resolve`, `./shared`) are shared by both legs, which is what
 * keeps their exports and behavior identical.
 */
export { InputCompat } from './InputCompat'
export type {
  ColorTokenValue,
  FontFamilyTokenValue,
  InputCompatProps,
  InputCompatStyleProps,
  RadiusTokenValue,
  SpaceTokenValue,
} from './props'
export { inputStyles, STYLE_PROP_KEYS as INPUT_STYLE_PROP_KEYS } from './props'
