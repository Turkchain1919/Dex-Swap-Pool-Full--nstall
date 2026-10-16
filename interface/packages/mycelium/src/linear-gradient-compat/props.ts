/**
 * The `LinearGradient` compat prop contract. The legacy component
 * (`@tamagui/linear-gradient`, re-exported from the `ui/src` barrel) is a
 * YStack frame (`overflow: 'hidden'`, `position: 'relative'`) that renders an
 * absolutely-filled gradient element behind its children, plus the
 * expo-linear-gradient stop surface (`colors`/`locations`/`start`/`end`). The
 * frame surface is the plain stack surface `ViewCompatStyleProps` already
 * models, so the compat contract is that surface plus the four gradient props.
 */
import type { ColorValue, CompatProps } from '../compat/props'
import type { ViewCompatStyleProps } from '../view-compat/props'

/** A gradient control point, as a fraction of the rendered box (0–1 per axis). */
export interface LinearGradientPoint {
  x: number
  y: number
}

/** The legacy surface accepts the object form or the `[x, y]` tuple form. */
export type LinearGradientPointInput = LinearGradientPoint | readonly [number, number]

/** The expo-linear-gradient stop surface the legacy component layers over its frame. */
export interface LinearGradientStopProps {
  /** Gradient stops: Spore color tokens or raw CSS colors. */
  colors?: ReadonlyArray<ColorValue>
  /** Per-stop positions (0–1), same length as `colors`. */
  locations?: ReadonlyArray<number> | null
  /** Gradient start point; defaults to the top edge (`{ x: 0, y: 0 }`). */
  start?: LinearGradientPointInput | null
  /** Gradient end point; defaults to the bottom edge (`{ x: 0, y: 1 }`). */
  end?: LinearGradientPointInput | null
}

/** The frame's style surface: the plain stack surface, exactly like the legacy YStack frame. */
export type LinearGradientCompatStyleProps = ViewCompatStyleProps

/**
 * The full LinearGradient prop contract: frame styles + shared compat
 * surfaces + gradient stops. The stop props are OMITTED from the style side
 * first: `start`/`end` are also long-tail style props there, and the raw
 * intersection would collapse them to `never`-ish conflicts — the legacy
 * component likewise consumes the stop props before its frame sees them.
 */
export type LinearGradientCompatProps = Omit<
  CompatProps<LinearGradientCompatStyleProps>,
  keyof LinearGradientStopProps
> &
  LinearGradientStopProps
