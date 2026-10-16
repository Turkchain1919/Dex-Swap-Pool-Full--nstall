/**
 * `@universe/mycelium/dynamic-size-text` — the compat `DynamicSizeText`
 * (INFRA-3596), replacing the legacy Tamagui-bearing
 * `ui/src/components/text/DynamicSizeText/`.
 *
 * The component is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; `./props` is platform-neutral
 * and shared by both legs.
 */
export { DynamicSizeTextCompat } from './DynamicSizeTextCompat'
export {
  DEFAULT_MAX_WEB_FONT_SIZE,
  DEFAULT_MIN_WEB_FONT_SIZE,
  type DynamicSizeTextFitOptions,
  type DynamicSizeTextProps,
} from './props'
