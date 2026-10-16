import { Flex, ModalCloseIcon, Text, TouchableArea } from '@universe/mycelium'
import { BackArrow } from '@universe/mycelium/icons/BackArrow'

interface EarnAmountViewHeaderProps {
  title: string
  onBack: () => void
  onClose: () => void
}

export function EarnAmountViewHeader({ title, onBack, onClose }: EarnAmountViewHeaderProps): JSX.Element {
  return (
    <Flex row alignItems="center" justifyContent="center" minHeight="$spacing32" position="relative">
      <Flex left={0} position="absolute">
        <TouchableArea onPress={onBack} hoverable>
          <BackArrow color="$neutral2" size="$icon.24" />
        </TouchableArea>
      </Flex>
      <Text variant="body2" color="$neutral1" textAlign="center" px="$spacing48" numberOfLines={1}>
        {title}
      </Text>
      <Flex right={0} position="absolute">
        <ModalCloseIcon onClose={onClose} />
      </Flex>
    </Flex>
  )
}
