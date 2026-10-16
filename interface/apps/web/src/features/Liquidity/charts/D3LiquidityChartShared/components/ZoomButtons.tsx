import { Flex, TouchableArea, type TouchableAreaCompatProps } from '@universe/mycelium'
import { Expand } from '@universe/mycelium/icons/Expand'
import { SearchMinus } from '@universe/mycelium/icons/SearchMinus'
import { SearchPlus } from '@universe/mycelium/icons/SearchPlus'

const ZoomOptionButton = ({ children, ...props }: TouchableAreaCompatProps) => {
  return (
    <TouchableArea
      transition="opacity 100ms ease-in-out"
      backgroundColor="$transparent"
      hoverStyle={{ backgroundColor: '$transparent', opacity: 0.8 }}
      pressStyle={{ backgroundColor: '$surface3', opacity: 0.8 }}
      alignItems="center"
      justifyContent="center"
      borderColor="$surface3"
      borderWidth="$spacing1"
      p="$spacing8"
      {...props}
    >
      {children}
    </TouchableArea>
  )
}

export function ZoomButtons({
  onZoomIn,
  onZoomOut,
  onReset,
  resetDisabled = false,
}: {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  resetDisabled?: boolean
}) {
  return (
    <Flex row centered borderRadius="$roundedFull">
      <ZoomOptionButton borderTopLeftRadius="$roundedFull" borderBottomLeftRadius="$roundedFull" onPress={onZoomOut}>
        <SearchMinus size={16} color="$neutral1" />
      </ZoomOptionButton>
      <ZoomOptionButton
        disabled={resetDisabled}
        borderRadius="$none"
        borderLeftWidth={0}
        borderRightWidth={0}
        onPress={onReset}
      >
        <Expand size={16} color="$neutral1" />
      </ZoomOptionButton>
      <ZoomOptionButton borderTopRightRadius="$roundedFull" borderBottomRightRadius="$roundedFull" onPress={onZoomIn}>
        <SearchPlus size={16} color="$neutral1" />
      </ZoomOptionButton>
    </Flex>
  )
}
