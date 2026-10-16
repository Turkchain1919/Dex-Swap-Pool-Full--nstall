import { Flex, Text } from '@universe/mycelium'
import { SCREEN_ITEM_HORIZONTAL_PAD } from 'src/app/constants'

export function SettingsSection({
  title,
  children,
}: {
  title: string
  children: JSX.Element | JSX.Element[]
}): JSX.Element {
  return (
    <Flex gap="$spacing8">
      <Text color="$neutral2" px={SCREEN_ITEM_HORIZONTAL_PAD} variant="subheading2">
        {title}
      </Text>
      {children}
    </Flex>
  )
}
