/**
 * Platform-neutral gradient math for the LinearGradient compat:
 * stop-color resolution against the Spore color maps, and the
 * `linear-gradient(…)` CSS expression ported from the legacy web
 * implementation (`@tamagui/linear-gradient`'s vendored
 * expo-linear-gradient web leg), whose angle depends on the rendered box's
 * aspect ratio for diagonal start/end points.
 */
import type { OpaqueColorValue } from 'react-native'
import {
  COLOR_TOKEN_CLASS,
  LITERAL_SEMANTIC_COLORS,
  lookupToken,
  resolveColorOrWarn,
  type TamaguiVariable,
  THEMED_COLOR_TOKEN_CLASSES,
} from '../compat/tokens'
import type { LinearGradientPointInput, LinearGradientStopProps } from './props'

/**
 * A resolved gradient stop color: either a literal CSS color usable on both
 * platforms, or the name of the auto-switching theme variable that carries the
 * token's per-theme value (`variables.css` on web, `native.css` via uniwind).
 */
export type GradientStopColor = { kind: 'literal'; value: string } | { kind: 'variable'; name: string }

/**
 * Resolve one stop color with the compat color boundary's posture: known
 * semantic tokens ride their auto-switching variable (or their pinned literal
 * for the theme-invariant set), themed hovered tokens ride their light-suffix
 * alias (declared under both themes), raw CSS colors pass through, and an
 * unknown `$` token throws instead of guessing — the same contract as
 * `colorTokenCssValue`, kept separate because the native leg needs the
 * variable NAME (expo-linear-gradient takes real color values, not `var()`
 * expressions).
 */
export function gradientStopColor(value: string | TamaguiVariable | OpaqueColorValue): GradientStopColor {
  // Legacy resolves a runtime Variable through getVariableValue (its `val`)
  // before its own token lookup — the compat unwraps the same way (INFRA-3258).
  // `resolveColorOrWarn` also covers a legacy `OpaqueColorValue` (INFRA-3804):
  // unlike backgroundColor/borderColor there is no native-style passthrough
  // for a gradient stop, so a dropped stop degrades to transparent — no real
  // call site passes one today.
  const raw = resolveColorOrWarn(value)
  if (raw === undefined) {
    return { kind: 'literal', value: 'transparent' }
  }
  const semantic = lookupToken(COLOR_TOKEN_CLASS, raw)
  if (semantic !== undefined) {
    const literal = lookupToken(LITERAL_SEMANTIC_COLORS, semantic)
    return literal !== undefined ? { kind: 'literal', value: literal } : { kind: 'variable', name: `--${semantic}` }
  }
  const themed = lookupToken(THEMED_COLOR_TOKEN_CLASSES, raw)
  if (themed !== undefined) {
    return { kind: 'variable', name: `--${themed.light}` }
  }
  if (raw.startsWith('$')) {
    throw new Error(`compat: color token "${raw}" for "colors" has no @universe/tailwind counterpart`)
  }
  return { kind: 'literal', value: raw }
}

/** The stop's web CSS expression: the literal, or a `var()` read of the theme variable. */
export function gradientStopCssExpression(value: string | TamaguiVariable | OpaqueColorValue): string {
  const resolved = gradientStopColor(value)
  return resolved.kind === 'literal' ? resolved.value : `var(${resolved.name})`
}

function controlPoint(
  point: LinearGradientPointInput | null | undefined,
  fallback: [number, number],
): [number, number] {
  if (point === null || point === undefined) {
    return fallback
  }
  // `in` rather than Array.isArray: isArray does not narrow readonly tuples.
  if ('x' in point) {
    return [point.x, point.y]
  }
  return [point[0], point[1]]
}

/**
 * The legacy angle math, byte-for-byte: control points scale by the measured
 * box (so diagonal gradients keep their angle across aspect ratios; axis-
 * aligned gradients are box-independent), and the CSS angle is 90° off the
 * atan2 of the scaled delta.
 */
export function gradientAngleDegrees(args: {
  start?: LinearGradientPointInput | null
  end?: LinearGradientPointInput | null
  width?: number
  height?: number
}): number {
  const { start, end, width = 1, height = 1 } = args
  const [startX, startY] = controlPoint(start, [0, 0])
  const [endX, endY] = controlPoint(end, [0, 1])
  const px = endX * width - startX * width
  const py = endY * height - startY * height
  return 90 + (Math.atan2(py, px) * 180) / Math.PI
}

/**
 * The `linear-gradient(…)` expression for the web leg, or `undefined` below
 * two stops — the exact native contract: the native leg skips its gradient
 * element under the expo-linear-gradient two-stop minimum, and a one-stop
 * `linear-gradient(90deg, red)` would be a web-only solid fill. (The legacy
 * web leg emitted the invalid empty form the browser dropped; every audited
 * call site passes 2+ stops.) A zero/absent location is omitted like the
 * legacy implementation (a falsy-check it inherited from expo) — CSS places
 * an unpositioned first stop at 0%, so the render is identical.
 */
export function linearGradientBackgroundImage(
  props: LinearGradientStopProps & { width?: number; height?: number },
): string | undefined {
  const { colors, locations } = props
  if (colors === undefined || colors.length < 2) {
    return undefined
  }
  const stops = colors.map((color, index) => {
    const expression = gradientStopCssExpression(color)
    const location = locations?.[index]
    if (location !== undefined && location !== 0) {
      const clamped = Math.max(0, Math.min(1, location))
      return `${expression} ${clamped * 100}%`
    }
    return expression
  })
  return `linear-gradient(${gradientAngleDegrees(props)}deg, ${stops.join(', ')})`
}
