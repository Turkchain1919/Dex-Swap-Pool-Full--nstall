import { Flex } from '@universe/mycelium'
import type { FlexCompatProps as FlexProps, IconSizeTokens } from '@universe/mycelium'
import { HeightAnimator } from '@universe/mycelium/height-animator'
import { RotatableChevron } from '@universe/mycelium/icons/RotatableChevron'
import { PropsWithChildren, ReactElement } from 'react'

export function Expand({
  header,
  button,
  children,
  testId,
  isOpen,
  padding,
  onToggle,
  iconSize = '$icon.24',
  paddingTop,
  width,
}: PropsWithChildren<{
  header?: ReactElement
  button: ReactElement
  testId?: string
  isOpen: boolean
  padding?: FlexProps['p']
  onToggle: () => void
  iconSize?: IconSizeTokens
  paddingTop?: FlexProps['pt']
  width?: FlexProps['width']
}>) {
  return (
    <Flex p={padding} width={width}>
      <Flex row justifyContent="space-between">
        {header}
        <Flex
          row
          cursor="pointer"
          width="unset"
          justifyContent="flex-end"
          data-testid={testId}
          onPress={onToggle}
          aria-expanded={isOpen}
        >
          {button}
          <RotatableChevron size={iconSize} direction={isOpen ? 'up' : 'down'} color="$neutral2" />
        </Flex>
      </Flex>
      <HeightAnimator open={isOpen}>
        <Flex gap="$gap12" pt={paddingTop}>
          {children}
        </Flex>
      </HeightAnimator>
    </Flex>
  )
}
