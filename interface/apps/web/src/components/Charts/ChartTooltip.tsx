import { Flex, type FlexCompatProps } from '@universe/mycelium'

type ChartTooltipProps = FlexCompatProps & {
  includeBorder?: boolean
}

const INCLUDE_BORDER_STYLES: FlexCompatProps = {
  backgroundColor: '$surface5',
  backdropFilter: 'blur(8px)',
  borderRadius: '$rounded8',
  borderColor: '$surface3',
  borderWidth: 1,
  p: '$spacing8',
}

// Renders a single element so ChartModel can position it imperatively via `id`.
// Instance props spread last so callers can override the base and variant styles
// (StaleBanner repositions and restyles this frame).
export function ChartTooltip({ includeBorder, ...rest }: ChartTooltipProps): JSX.Element {
  return (
    <Flex
      alignItems="center"
      position="absolute"
      left={0}
      top={0}
      zIndex="$tooltip"
      borderWidth={0}
      borderStyle="solid"
      pointerEvents="none" // Prevent tooltip from interfering with mouse events
      {...(includeBorder ? INCLUDE_BORDER_STYLES : undefined)}
      {...rest}
    />
  )
}
