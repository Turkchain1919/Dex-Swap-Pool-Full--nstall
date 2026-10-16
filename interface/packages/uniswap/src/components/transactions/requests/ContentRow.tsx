import { Flex, Text, type FlexCompatProps as FlexProps, type TextCompatProps as TextProps } from '@universe/mycelium'
import { PropsWithChildren } from 'react'

export function ContentRow({
  label,
  variant = 'body4',
  textColor = '$neutral2',
  children,
  alignItems = 'center',
  justifyContent = 'space-between',
  gap = '$spacing8',
}: PropsWithChildren<{
  label: string | JSX.Element
  variant?: TextProps['variant']
  textColor?: TextProps['color']
  alignItems?: FlexProps['alignItems']
  justifyContent?: FlexProps['justifyContent']
  gap?: FlexProps['gap']
}>): JSX.Element {
  return (
    <Flex row gap={gap} justifyContent={justifyContent} alignItems={alignItems}>
      {typeof label === 'string' ? (
        <Text color={textColor} flexShrink={0} variant={variant}>
          {label}
        </Text>
      ) : (
        label
      )}
      {children}
    </Flex>
  )
}
