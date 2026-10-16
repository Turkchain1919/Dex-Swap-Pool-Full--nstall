import { Flex, iconSizes, Text, TouchableArea } from '@universe/mycelium'
import type { GeneratedIcon } from '@universe/mycelium/icons'

export function OptionCard({
  Icon,
  title,
  subtitle,
  onPress,
}: {
  Icon: GeneratedIcon
  title: string
  subtitle: string
  onPress: () => void
}): JSX.Element {
  return (
    <TouchableArea
      width="100%"
      shadowColor="$shadowColor"
      shadowOpacity={0.05}
      shadowRadius={8}
      borderWidth="$spacing1"
      borderColor="$surface3"
      borderRadius="$rounded20"
      onPress={onPress}
    >
      <Flex row fill gap="$spacing12" p="$spacing12" width="100%">
        <Flex
          centered
          backgroundColor="$accent2"
          borderRadius="$roundedFull"
          height={iconSizes.icon32}
          width={iconSizes.icon32}
        >
          <Icon color="$accent1" size="$icon.16" />
        </Flex>

        <Flex fill gap="$spacing4">
          <Text variant="body2">{title}</Text>

          <Text color="$neutral2" variant="body3">
            {subtitle}
          </Text>
        </Flex>
      </Flex>
    </TouchableArea>
  )
}
