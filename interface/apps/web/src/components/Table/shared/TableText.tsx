import { Text } from '@universe/mycelium'
import type { TextCompatProps as TextProps } from '@universe/mycelium'
import { PropsWithChildren } from 'react'

export const TableText = ({ children, ...props }: PropsWithChildren<TextProps>) => {
  return (
    <Text color="$neutral1" variant="body2" {...props}>
      {children}
    </Text>
  )
}

export const EllipsisText = ({ children, ...props }: PropsWithChildren<TextProps>) => {
  return (
    <TableText {...props} whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
      {children}
    </TableText>
  )
}
