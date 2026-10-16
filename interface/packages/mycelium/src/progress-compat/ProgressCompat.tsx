/**
 * Drop-in replacement for the `ui/src` Tamagui `Progress` (INFRA-3645),
 * reproducing `@tamagui/progress` (itself a Radix fork) on the compat `Flex`.
 *
 * Behaviour ported from the legacy component (one deliberate correctness fix,
 * noted below):
 *  - The root measures its own rendered width through `onLayout` and hands it
 *    to the indicator through context. The indicator is full track width and
 *    slid left by the un-filled fraction (`translateX`), so the visible portion
 *    equals `value / max` (the Radix translate pattern). The legacy component
 *    divided by a literal `100` — correct only at the default `max` of 100; the
 *    compat divides by `max`, so a non-default `max` fills accurately.
 *  - Until the first layout the width is `0`: the indicator renders at
 *    `opacity: 0` so the bar is not painted at its unmeasured position, then
 *    fades in once the track width is known — the legacy first-render guard.
 *  - The frame's own defaults (pill radius, clipped overflow, the `size="$true"`
 *    height/min-width) sit before the caller's props, so an explicit `height` /
 *    `backgroundColor` / `margin` overrides them exactly as under Tamagui.
 *
 * The legacy `animation` prop rides the shared compat surface (accepted; the
 * Spore curve timing is a driver concern the static compat layer does not
 * reproduce, see `CompatAnimationProps`). Its VALUE is still read here, so the
 * indicator carries legacy's two scoping defaults — `animateOnly` transform-only
 * and a null driver until the track is measured — whatever a driver does with
 * them later.
 */
import * as React from 'react'
import type { CompatEventProps } from '../compat/props'
import { FlexCompat } from '../flex-compat/FlexCompat'
import type { ProgressCompatProps, ProgressIndicatorCompatProps } from './props'

const DEFAULT_MAX = 100

type ProgressState = 'indeterminate' | 'complete' | 'loading'

// The legacy Radix `data-state`: indeterminate when value is null, complete at
// max, loading otherwise (`@tamagui/progress` uses `value === max`).
function getProgressState(value: number | null, max: number): ProgressState {
  return value === null ? 'indeterminate' : value === max ? 'complete' : 'loading'
}

// The legacy `size="$true"` variant derives the track's defaults from the
// `$true` size token (`space.true` = `spacing8` = 8):
//   height   = round(8 * 0.25)      = 2
//   minWidth = height * 20          = 40
//   width    = '100%'
// The only consumer overrides `height`, so these matter only as the fallback.
const TRACK_DEFAULT_HEIGHT = 2
const TRACK_DEFAULT_MIN_WIDTH = 40

interface ProgressContextValue {
  value: number | null
  max: number
  width: number
}

const ProgressContext = React.createContext<ProgressContextValue>({ value: null, max: DEFAULT_MAX, width: 0 })

function defaultGetValueLabel(value: number, max: number): string {
  return `${Math.round((value / max) * 100)}%`
}

function isValidMax(max: number | undefined): max is number {
  return typeof max === 'number' && !Number.isNaN(max) && max > 0
}

function isValidValue(value: number | null | undefined, max: number): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && value <= max && value >= 0
}

const ProgressIndicator = React.forwardRef<HTMLElement, ProgressIndicatorCompatProps>(
  function ProgressIndicator(indicatorProps, ref): React.JSX.Element {
    const { value, max, width } = React.useContext(ProgressContext)
    // Fraction of the track left unfilled (`value / max` filled). The legacy
    // `@tamagui/progress` divided by a literal 100, so any `max !== 100` slid the
    // bar to the wrong offset; honour `max` here. A non-positive max has no valid
    // fill fraction — treat it as fully unfilled (indeterminate).
    const unfilledFraction = max > 0 ? (max - (value ?? 0)) / max : 1
    // Match the legacy fallback: before measurement (width 0) assume a wide track
    // so the bar starts fully off-screen rather than snapping from zero width.
    const x = -(width === 0 ? 300 : width) * unfilledFraction

    const { animation, ...restIndicatorProps } = indicatorProps
    // Object spread, not JSX attributes: the migration lint bans the attribute form.
    // Legacy's precedence — `animateOnly` before the caller spread so it can be widened,
    // the pre-measurement driver guard after it so it always wins.
    const scopedAnimateOnly = { animateOnly: ['transform'] }
    const guardedAnimation = { animation: width === 0 ? null : animation }

    return (
      <FlexCompat
        ref={ref}
        height="100%"
        width={width}
        backgroundColor="$background"
        x={x}
        opacity={width === 0 ? 0 : 1}
        {...scopedAnimateOnly}
        data-state={getProgressState(value, max)}
        data-value={value ?? undefined}
        data-max={max}
        {...restIndicatorProps}
        {...guardedAnimation}
      />
    )
  },
)
ProgressIndicator.displayName = 'ProgressIndicator'

const ProgressRoot = React.forwardRef<HTMLElement, ProgressCompatProps>(function Progress(
  {
    value: valueProp,
    max: maxProp,
    getValueLabel = defaultGetValueLabel,
    onLayout: onLayoutProp,
    children,
    ...frameProps
  },
  ref,
): React.JSX.Element {
  const max = isValidMax(maxProp) ? maxProp : DEFAULT_MAX
  const value = isValidValue(valueProp, max) ? valueProp : null
  const valueLabel = value === null ? undefined : getValueLabel(value, max)
  const [width, setWidth] = React.useState(0)

  const contextValue = React.useMemo<ProgressContextValue>(() => ({ value, max, width }), [value, max, width])

  const handleLayout = React.useCallback<NonNullable<CompatEventProps['onLayout']>>(
    (event) => {
      setWidth(event.nativeEvent.layout.width)
      onLayoutProp?.(event)
    },
    [onLayoutProp],
  )

  return (
    <ProgressContext.Provider value={contextValue}>
      <FlexCompat
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value ?? undefined}
        aria-valuetext={valueLabel}
        data-state={getProgressState(value, max)}
        data-value={value ?? undefined}
        data-max={max}
        overflow="hidden"
        borderRadius="$roundedFull"
        backgroundColor="$background"
        width="100%"
        minWidth={TRACK_DEFAULT_MIN_WIDTH}
        height={TRACK_DEFAULT_HEIGHT}
        {...frameProps}
        onLayout={handleLayout}
      >
        {children}
      </FlexCompat>
    </ProgressContext.Provider>
  )
})
ProgressRoot.displayName = 'Progress'

// Both parts forward their ref to the underlying compat Flex, matching the ref
// forwarding the `createCompatComponent` primitives expose, so a hand-written
// call site passing `ref` (like the legacy Tamagui `Progress`) resolves a node.
type ProgressComponent = React.ForwardRefExoticComponent<ProgressCompatProps & React.RefAttributes<HTMLElement>> & {
  Indicator: React.ForwardRefExoticComponent<ProgressIndicatorCompatProps & React.RefAttributes<HTMLElement>>
}

/** Legacy `Progress` with the `Progress.Indicator` static, matching `ui/src`. */
export const ProgressCompat: ProgressComponent = Object.assign(ProgressRoot, { Indicator: ProgressIndicator })
