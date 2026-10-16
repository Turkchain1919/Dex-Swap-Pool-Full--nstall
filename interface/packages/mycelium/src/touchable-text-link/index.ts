/**
 * `@universe/mycelium/touchable-text-link` — the compat `TouchableTextLink`
 * (INFRA-3487), replacing the legacy Tamagui `TouchableTextLink` from
 * `packages/ui/src/components/touchable/TouchableTextLink`.
 *
 * The component is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; the platform-neutral modules
 * (`./props`, `./resolve`) are shared by both legs, which is what keeps their
 * exports and behavior identical.
 */
export { TouchableTextLinkCompat } from './TouchableTextLinkCompat'
export {
  DEFAULT_LINK_COLOR,
  DEFAULT_LINK_TARGET,
  DEFAULT_LINK_VARIANT,
  DISABLED_LINK_COLOR,
  type TouchableTextLinkColor,
  type TouchableTextLinkProps,
  type TouchableTextLinkVariant,
} from './props'
export { linkFocusPool, linkHoverPool, linkTextColor, maybeHoverColor } from './resolve'
