/**
 * The `Progress` compat prop contract (INFRA-3645): the legacy `ui/src`
 * `Progress` / `Progress.Indicator` surface (`@tamagui/progress`, a Radix
 * fork). Both parts render a compat `Flex`, so their style/behavioral surface
 * is `FlexCompatProps`; the root adds the Radix value knobs
 * (`value`/`max`/`getValueLabel`), and the indicator reads them from context.
 *
 * The legacy `size` variant is not carried onto the prop surface: it exists to
 * derive the track's default height/min-width, and the only consumer
 * (`Table/columns/Allocation.tsx`) passes an explicit `height` instead. A call
 * site that needs a non-default `size` flags to the manual lane rather than
 * converting into a silently-ignored prop.
 */
import type { FlexCompatProps } from '../flex-compat/props'

export interface ProgressExtraProps {
  /** 0…`max`; anything out of range renders as indeterminate (legacy `null`). */
  value?: number | null
  /** Denominator for the fill fraction (legacy default 100). */
  max?: number
  /** Builds the `aria-valuetext` label; legacy default is the rounded percent. */
  getValueLabel?: (value: number, max: number) => string
}

/** The root `Progress` prop contract: the compat Flex surface + the value knobs. */
export type ProgressCompatProps = FlexCompatProps & ProgressExtraProps

/** The `Progress.Indicator` prop contract: the compat Flex surface. */
export type ProgressIndicatorCompatProps = FlexCompatProps
