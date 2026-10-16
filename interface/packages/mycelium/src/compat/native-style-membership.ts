import { NATIVE_LONG_TAIL_PROPS } from './native-long-tail'
/**
 * Whether a prop name is one `compatLayoutNativeStyle` reads AT ALL —
 * regardless of whether a given VALUE ends up resolving to a style key or a
 * drop. This is "does the lane consult this key," not "did this key
 * resolve" — the distinction a `$platform-native` pool checker needs
 * (INFRA-3500): a pool key outside this set has no style-lane expression
 * whatsoever (it is class-lane only, e.g. `textAlign`), so the lane silently
 * ignoring it is a real gap, not a resolved-vs-dropped outcome
 * `native-style.ts` already reports.
 *
 * Extracted into its own module (rather than living in `native-style.ts`
 * alongside the builders it describes) purely for the oxlint `max-lines` cap
 * — the same reason `native-long-tail.ts` exists.
 */
import { BORDER_WIDTH_PROPS, EDGE_PROPS, GAP_PROPS, SIZING_PROPS, SPACING_PAIRS, TRANSFORM_PROPS } from './native-style'

const COMPAT_LAYOUT_STYLE_PROP_SET: ReadonlySet<string> = new Set<string>([
  ...SPACING_PAIRS.flatMap(([, longhand, shorthand]) => [longhand, shorthand]),
  ...SIZING_PROPS,
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'opacity',
  'overflow',
  ...BORDER_WIDTH_PROPS,
  ...EDGE_PROPS,
  'zIndex',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'boxShadow',
  ...TRANSFORM_PROPS,
  'transform',
  'transformOrigin',
  'flex',
  'flexBasis',
  'flexGrow',
  'flexShrink',
  ...GAP_PROPS,
  'inset',
  ...NATIVE_LONG_TAIL_PROPS,
])

/** See the module docstring. */
export function isCompatLayoutStyleProp(prop: string): boolean {
  return COMPAT_LAYOUT_STYLE_PROP_SET.has(prop)
}
