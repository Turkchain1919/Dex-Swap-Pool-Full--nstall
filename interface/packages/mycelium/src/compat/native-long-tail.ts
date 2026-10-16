/**
 * The long-tail props (`compat/style-props.ts`, plus Text's extras) that are
 * genuine RN style keys and take their value through unchanged. Everything else
 * in that ~197-prop table is web-only CSS and is reported as dropped.
 *
 * Extracted from `native-style.ts` purely for the oxlint `max-lines` cap (the
 * same reason `decode-arbitrary-value.ts` exists).
 */
export const NATIVE_LONG_TAIL_PROPS: ReadonlySet<string> = new Set([
  'alignContent',
  'aspectRatio',
  'backfaceVisibility',
  'borderBlockColor',
  'borderBlockEndColor',
  'borderBlockStartColor',
  'borderBottomColor',
  'borderBottomEndRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderBottomStartRadius',
  'borderCurve',
  'borderEndColor',
  'borderEndEndRadius',
  'borderEndStartRadius',
  'borderEndWidth',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderStartEndRadius',
  'borderStartStartRadius',
  'borderStartWidth',
  'borderStyle',
  'borderTopColor',
  'borderTopEndRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderTopStartRadius',
  'cursor',
  'direction',
  'end',
  // Text-only extras (text-compat/style-props.ts) — real RN TextStyle keys.
  'fontVariant',
  'textDecorationStyle',
  'marginEnd',
  'marginStart',
  'outlineColor',
  'outlineOffset',
  'outlineStyle',
  'outlineWidth',
  'paddingEnd',
  'paddingStart',
  'pointerEvents',
  'start',
  'userSelect',
])
