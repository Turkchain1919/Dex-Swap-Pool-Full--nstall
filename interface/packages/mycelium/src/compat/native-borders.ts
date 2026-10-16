/**
 * The border-width family of the native style lane, with the implicit border
 * colour it declares for width-with-no-colour styles (see
 * `IMPLICIT_BORDER_COLOR` in `native-values.ts` for why the leg declares the
 * value uniwind would otherwise inject).
 *
 * Extracted from `native-style.ts` purely for the oxlint `max-lines` cap (the
 * same reason `native-long-tail.ts` and `decode-arbitrary-value.ts` exist).
 */
import { IMPLICIT_BORDER_COLOR, nativeBorderWidth } from './native-values'
import type { CompatStyleProps } from './props'
import { BORDER_WIDTH_PROPS } from './style-props'

/**
 * `[width prop, authored colour props]` per physical side, for scoping the
 * implicit colour below. The logical colour spellings are genuine RN style keys
 * (`NATIVE_LONG_TAIL_PROPS`) that `applyLongTail` carries into this same style
 * object, so each counts as authored for every physical side it can resolve to
 * — `borderStartColor`/`borderEndColor` for BOTH flanks, because the writing
 * direction is unknowable in this pure function.
 */
const BORDER_SIDE_COLOR_PAIRS = [
  ['borderTopWidth', ['borderTopColor', 'borderBlockColor', 'borderBlockStartColor']],
  ['borderBottomWidth', ['borderBottomColor', 'borderBlockColor', 'borderBlockEndColor']],
  ['borderLeftWidth', ['borderLeftColor', 'borderStartColor', 'borderEndColor']],
  ['borderRightWidth', ['borderRightColor', 'borderStartColor', 'borderEndColor']],
] as const

export function applyBorders({
  props,
  style,
  dropped,
}: {
  props: CompatStyleProps
  style: Record<string, unknown>
  dropped: string[]
}): void {
  let hasBorderWidth = false
  for (const key of BORDER_WIDTH_PROPS) {
    const value = props[key]
    if (value === undefined) {
      continue
    }
    const resolved = nativeBorderWidth(value)
    if (resolved === undefined) {
      dropped.push(key)
      continue
    }
    hasBorderWidth = true
    style[key] = resolved
  }
  if (!hasBorderWidth || props.borderColor !== undefined) {
    return
  }
  // The per-side colour longhands are long-tail props absent from
  // `CompatStyleProps` (the `hasOwnBorderWidth` cast precedent).
  const sideColorProps = props as Readonly<Record<string, unknown>>
  if (BORDER_SIDE_COLOR_PAIRS.every(([, colorKeys]) => colorKeys.every((key) => sideColorProps[key] === undefined))) {
    style['borderColor'] = IMPLICIT_BORDER_COLOR
    return
  }
  // A side with an AUTHORED colour is never this lane's to blacken: the implicit
  // colour only makes uniwind's width-with-no-colour fallback explicit, and a
  // blanket shorthand would stamp black beside a per-side declaration this lane
  // cannot carry (a dropped `$` token, INFRA-3339), overriding whatever lane
  // does carry it. Width-painting sides the author left colourless keep the
  // legacy black, declared per PHYSICAL side; a side only possibly covered by a
  // logical spelling is skipped rather than blackened, because injected physical
  // black beside an authored logical colour would contest RN's edge resolution
  // where the blanket shorthand always lost to it — the skipped side falls to
  // RN's own identical black default.
  for (const [widthKey, colorKeys] of BORDER_SIDE_COLOR_PAIRS) {
    const sidePaints = style[widthKey] !== undefined || style['borderWidth'] !== undefined
    if (sidePaints && colorKeys.every((key) => sideColorProps[key] === undefined)) {
      style[widthKey.replace('Width', 'Color')] = IMPLICIT_BORDER_COLOR
    }
  }
}
