import { Flex, TouchableArea } from '@universe/mycelium'
import { TrendUp } from '@universe/mycelium/icons/TrendUp'

interface SwapChartToggleButtonProps {
  showChart: boolean
  onPress: () => void
}

export function SwapChartToggleButton({ showChart, onPress }: SwapChartToggleButtonProps): JSX.Element {
  return (
    <TouchableArea
      centered
      width={32}
      height={32}
      borderRadius="$rounded8"
      backgroundColor={showChart ? '$surface3' : undefined}
      hoverStyle={{ backgroundColor: '$surface2' }}
      onPress={onPress}
    >
      {/* Scoped to transform only, matching the legacy Tamagui 'fast' curve. */}
      <Flex style={{ transition: 'transform 100ms cubic-bezier(0.17, 0.67, 0.45, 1)' }} hoverStyle={{ scale: 1.1 }}>
        <TrendUp color={showChart ? '$neutral1' : '$neutral2'} size="$icon.24" />
      </Flex>
    </TouchableArea>
  )
}
